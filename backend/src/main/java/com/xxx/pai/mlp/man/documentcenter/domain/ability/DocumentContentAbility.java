package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.ContentValidationResultBO;
import java.util.Collection;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class DocumentContentAbility {

    private static final int MAX_CONTENT_JSON_BYTES = 2 * 1024 * 1024;
    private static final int MAX_MERMAID_BLOCKS = 50;
    private static final int MAX_MERMAID_SOURCE_CHARS = 50 * 1024;
    private static final String NODE_TYPE_MERMAID = "mermaid";

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentValidationResultBO validateDraftContent(Integer schemaVersion, String contentJson) {
        if (schemaVersion == null || schemaVersion < 1) {
            return ContentValidationResultBO.invalid("schemaVersion must be greater than 0");
        }
        if (contentJson == null || contentJson.length() > MAX_CONTENT_JSON_BYTES) {
            return ContentValidationResultBO.invalid("contentJson is empty or too large");
        }
        try {
            MermaidStats mermaidStats = new MermaidStats();
            collectMermaidStats(objectMapper.readValue(contentJson, Object.class), mermaidStats);
            if (mermaidStats.count > MAX_MERMAID_BLOCKS) {
                return ContentValidationResultBO.invalid("Mermaid block count exceeds 50");
            }
            if (mermaidStats.oversized) {
                return ContentValidationResultBO.invalid("Mermaid source exceeds 50KB");
            }
        } catch (JsonProcessingException exception) {
            return ContentValidationResultBO.invalid("contentJson is not valid json");
        }
        return ContentValidationResultBO.valid();
    }

    @SuppressWarnings("unchecked")
    private void collectMermaidStats(Object value, MermaidStats mermaidStats) {
        if (value instanceof Map) {
            Map<String, Object> node = (Map<String, Object>) value;
            if (NODE_TYPE_MERMAID.equals(node.get("type"))) {
                mermaidStats.count++;
                String source = resolveMermaidSource(node);
                if (source.length() > MAX_MERMAID_SOURCE_CHARS) {
                    mermaidStats.oversized = true;
                }
            }
            for (Object child : node.values()) {
                collectMermaidStats(child, mermaidStats);
            }
            return;
        }
        if (value instanceof Collection) {
            for (Object item : (Collection<?>) value) {
                collectMermaidStats(item, mermaidStats);
            }
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
    }
}
