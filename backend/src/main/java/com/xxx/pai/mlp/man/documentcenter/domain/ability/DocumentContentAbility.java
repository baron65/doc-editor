package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.ContentValidationResultBO;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.Locale;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class DocumentContentAbility {

    private static final int MAX_CONTENT_JSON_BYTES = 2 * 1024 * 1024;
    private static final int MAX_MERMAID_BLOCKS = 50;
    private static final int MAX_MERMAID_SOURCE_CHARS = 50 * 1024;
    private static final String NODE_TYPE_MERMAID = "mermaid";
    private static final int MAX_NODES = 10_000;
    private static final int MAX_DEPTH = 100;
    private static final Set<String> ALLOWED_NODE_TYPES = Set.of(
            "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
            "blockquote", "codeBlock", "horizontalRule", "hardBreak", "image", "attachment",
            "table", "tableRow", "tableHeader", "tableCell", "callout", "mermaid");
    private static final Set<String> ALLOWED_MARK_TYPES = Set.of(
            "bold", "italic", "underline", "strike", "code", "link", "textStyle");
    private static final Set<String> ALLOWED_TEXT_ALIGNMENTS = Set.of("left", "center", "right", "justify");
    private static final Pattern DANGEROUS_STYLE_VALUE = Pattern.compile(
            "url\\s*\\(|expression\\s*\\(|javascript\\s*:|@import|[;<>]", Pattern.CASE_INSENSITIVE);
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-f]{3,8}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern FUNCTION_COLOR = Pattern.compile(
            "^(?:rgba?|hsla?)\\(\\s*[-\\d.%\\s,/]+\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern NAMED_COLOR = Pattern.compile("^[a-z]{1,32}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern FONT_SIZE = Pattern.compile(
            "^(\\d+(?:\\.\\d{1,2})?)(px|em|rem|pt|%)$", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentValidationResultBO validateDraftContent(Integer schemaVersion, String contentJson) {
        if (schemaVersion == null || schemaVersion < 1) {
            return ContentValidationResultBO.invalid("schemaVersion must be greater than 0");
        }
        if (contentJson == null) {
            return ContentValidationResultBO.invalid("contentJson is empty");
        }
        if (contentJson.getBytes(StandardCharsets.UTF_8).length > MAX_CONTENT_JSON_BYTES) {
            return ContentValidationResultBO.tooLarge("contentJson is too large");
        }
        try {
            MermaidStats mermaidStats = new MermaidStats();
            Object root = objectMapper.readValue(contentJson, Object.class);
            validateNode(root, mermaidStats, 0);
            if (mermaidStats.count > MAX_MERMAID_BLOCKS) {
                return ContentValidationResultBO.invalid("Mermaid block count exceeds 50");
            }
            if (mermaidStats.oversized) {
                return ContentValidationResultBO.invalid("Mermaid source exceeds 50KB");
            }
        } catch (JsonProcessingException exception) {
            return ContentValidationResultBO.invalid("contentJson is not valid json");
        } catch (ValidationFailure failure) {
            return ContentValidationResultBO.invalid(failure.getMessage());
        }
        return ContentValidationResultBO.valid();
    }

    @SuppressWarnings("unchecked")
    private void validateNode(Object value, MermaidStats stats, int depth) {
        if (!(value instanceof Map)) {
            throw new ValidationFailure("content node must be an object");
        }
        if (depth > MAX_DEPTH) {
            throw new ValidationFailure("content depth exceeds 100");
        }
        stats.nodeCount++;
        if (stats.nodeCount > MAX_NODES) {
            throw new ValidationFailure("content node count exceeds 10000");
        }
        Map<String, Object> node = (Map<String, Object>) value;
        Object rawType = node.get("type");
        if (!(rawType instanceof String) || !ALLOWED_NODE_TYPES.contains(rawType)) {
            throw new ValidationFailure("unsupported node type");
        }
        String type = (String) rawType;
        if (depth == 0 && !"doc".equals(type)) {
            throw new ValidationFailure("root node type must be doc");
        }
        validateFormattingAttributes(type, node.get("attrs"));
        if ("attachment".equals(type)) {
            validateAttachmentAttributes(node.get("attrs"));
        }
        if (NODE_TYPE_MERMAID.equals(type)) {
            stats.count++;
            String source = resolveMermaidSource(node);
            if (source.length() > MAX_MERMAID_SOURCE_CHARS) {
                stats.oversized = true;
            }
            String normalizedSource = source.toLowerCase();
            if (normalizedSource.contains("javascript:") || normalizedSource.contains("<script")) {
                throw new ValidationFailure("unsafe Mermaid source");
            }
        }
        Object marks = node.get("marks");
        if (marks != null) {
            if (!(marks instanceof Collection)) {
                throw new ValidationFailure("marks must be an array");
            }
            for (Object mark : (Collection<?>) marks) {
                validateMark(mark);
            }
        }
        Object content = node.get("content");
        if (content != null) {
            if (!(content instanceof Collection)) {
                throw new ValidationFailure("content must be an array");
            }
            for (Object child : (Collection<?>) content) {
                validateNode(child, stats, depth + 1);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void validateMark(Object value) {
        if (!(value instanceof Map)) {
            throw new ValidationFailure("mark must be an object");
        }
        Map<String, Object> mark = (Map<String, Object>) value;
        Object rawType = mark.get("type");
        if (!(rawType instanceof String) || !ALLOWED_MARK_TYPES.contains(rawType)) {
            throw new ValidationFailure("unsupported mark type");
        }
        if ("link".equals(rawType)) {
            Object attrs = mark.get("attrs");
            Object href = attrs instanceof Map ? ((Map<String, Object>) attrs).get("href") : null;
            if (!(href instanceof String) || !isSafeHref((String) href)) {
                throw new ValidationFailure("unsafe link protocol");
            }
        }
        if ("textStyle".equals(rawType)) {
            Object attrs = mark.get("attrs");
            if (!(attrs instanceof Map)) {
                throw new ValidationFailure("text style attributes are required");
            }
            Map<String, Object> styleAttrs = (Map<String, Object>) attrs;
            if (!Set.of("color", "fontSize", "backgroundColor").containsAll(styleAttrs.keySet())) {
                throw new ValidationFailure("unsupported text style attribute");
            }
            boolean hasStyle = false;
            Object color = styleAttrs.get("color");
            if (color != null) {
                if (!isSafeTextColor(color)) {
                    throw new ValidationFailure("unsupported text color");
                }
                hasStyle = true;
            }
            Object fontSize = styleAttrs.get("fontSize");
            if (fontSize != null) {
                if (!isSafeFontSize(fontSize)) {
                    throw new ValidationFailure("unsupported font size");
                }
                hasStyle = true;
            }
            Object backgroundColor = styleAttrs.get("backgroundColor");
            if (backgroundColor != null) {
                if (!isSafeTextColor(backgroundColor)) {
                    throw new ValidationFailure("unsupported text background color");
                }
                hasStyle = true;
            }
            if (!hasStyle) {
                throw new ValidationFailure("text style is empty");
            }
        }
    }

    private boolean isSafeTextColor(Object value) {
        if (!(value instanceof String)) {
            return false;
        }
        String color = ((String) value).trim();
        if (color.isEmpty() || color.length() > 80 || DANGEROUS_STYLE_VALUE.matcher(color).find()) {
            return false;
        }
        return HEX_COLOR.matcher(color).matches()
                || FUNCTION_COLOR.matcher(color).matches()
                || NAMED_COLOR.matcher(color).matches();
    }

    private boolean isSafeFontSize(Object value) {
        if (!(value instanceof String)) {
            return false;
        }
        String fontSize = ((String) value).trim();
        if (fontSize.isEmpty() || fontSize.length() > 20 || DANGEROUS_STYLE_VALUE.matcher(fontSize).find()) {
            return false;
        }
        Matcher matcher = FONT_SIZE.matcher(fontSize);
        if (!matcher.matches()) {
            return false;
        }
        double size = Double.parseDouble(matcher.group(1));
        String unit = matcher.group(2).toLowerCase(Locale.ROOT);
        if ("px".equals(unit)) {
            return size >= 8 && size <= 72;
        }
        if ("pt".equals(unit)) {
            return size >= 6 && size <= 54;
        }
        if ("%".equals(unit)) {
            return size >= 50 && size <= 400;
        }
        return size >= 0.5 && size <= 4;
    }

    @SuppressWarnings("unchecked")
    private void validateFormattingAttributes(String type, Object value) {
        if (!(value instanceof Map)) {
            return;
        }
        Map<String, Object> attrs = (Map<String, Object>) value;
        boolean formattedBlock = "paragraph".equals(type) || "heading".equals(type);
        if (attrs.containsKey("textAlign")) {
            Object textAlign = attrs.get("textAlign");
            if (!formattedBlock || !(textAlign instanceof String)
                    || !ALLOWED_TEXT_ALIGNMENTS.contains(textAlign)) {
                throw new ValidationFailure("unsupported text alignment");
            }
        }
        if (attrs.containsKey("indent")) {
            Object indent = attrs.get("indent");
            if (!formattedBlock || !(indent instanceof Number)
                    || ((Number) indent).doubleValue() % 1 != 0
                    || ((Number) indent).intValue() < 0
                    || ((Number) indent).intValue() > 6) {
                throw new ValidationFailure("unsupported block indent");
            }
        }
    }

    private boolean isSafeHref(String href) {
        String value = href.trim();
        if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) {
            return true;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            return scheme != null && Set.of("http", "https", "mailto").contains(scheme.toLowerCase(Locale.ROOT));
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private void validateAttachmentAttributes(Object value) {
        if (!(value instanceof Map)) {
            return;
        }
        Object href = ((Map<String, Object>) value).get("href");
        if (href == null || (href instanceof String && ((String) href).trim().isEmpty())) {
            return;
        }
        if (!(href instanceof String) || !isSafeAttachmentHref((String) href)) {
            throw new ValidationFailure("unsafe attachment link protocol");
        }
    }

    private boolean isSafeAttachmentHref(String href) {
        String value = href.trim();
        if (value.startsWith("/") && !value.startsWith("//")) {
            return true;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            return scheme != null && Set.of("http", "https").contains(scheme.toLowerCase(Locale.ROOT));
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private String resolveMermaidSource(Map<String, Object> node) {
        Object source = node.get("source");
        if (source instanceof String) {
            return (String) source;
        }
        Object attrs = node.get("attrs");
        if (attrs instanceof Map) {
            Object attrSource = ((Map<String, Object>) attrs).get("source");
            if (attrSource instanceof String) {
                return (String) attrSource;
            }
        }
        return "";
    }

    private static class MermaidStats {
        private int count;
        private boolean oversized;
        private int nodeCount;
    }

    private static class ValidationFailure extends RuntimeException {
        private ValidationFailure(String message) {
            super(message);
        }
    }
}
