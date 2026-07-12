package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DocumentAssetAbility {

    @Value("${document-center.asset.image-extensions:jpg,jpeg,png,webp}")
    private String imageExtensions = "jpg,jpeg,png,webp";

    @Value("${document-center.asset.attachment-extensions:pdf,txt,md,csv,docx,xlsx,pptx,zip}")
    private String attachmentExtensions = "pdf,txt,md,csv,docx,xlsx,pptx,zip";

    private static final Map<String, Set<String>> MIME_TYPES = Map.ofEntries(
            Map.entry("jpg", Set.of("image/jpeg")),
            Map.entry("jpeg", Set.of("image/jpeg")),
            Map.entry("png", Set.of("image/png")),
            Map.entry("webp", Set.of("image/webp")),
            Map.entry("pdf", Set.of("application/pdf")),
            Map.entry("txt", Set.of("text/plain")),
            Map.entry("md", Set.of("text/markdown", "text/plain")),
            Map.entry("csv", Set.of("text/csv", "text/plain", "application/vnd.ms-excel")),
            Map.entry("docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip")),
            Map.entry("xlsx", Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip")),
            Map.entry("pptx", Set.of("application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip")),
            Map.entry("zip", Set.of("application/zip", "application/x-zip-compressed")));

    public boolean isAllowedSize(String assetKind, long sizeBytes) {
        if ("IMAGE".equals(assetKind)) {
            return sizeBytes <= 10L * 1024L * 1024L;
        }
        return sizeBytes <= 50L * 1024L * 1024L;
    }

    public boolean isAllowedType(String assetKind, String fileName, String mimeType, byte[] signature) {
        String extension = extensionOf(fileName);
        Set<String> allowedExtensions = "IMAGE".equals(assetKind)
                ? parseExtensions(imageExtensions)
                : "ATTACHMENT".equals(assetKind)
                    ? parseExtensions(attachmentExtensions)
                    : Collections.emptySet();
        if (!allowedExtensions.contains(extension)) {
            return false;
        }
        String normalizedMimeType = normalizeMimeType(mimeType);
        if (!MIME_TYPES.getOrDefault(extension, Collections.emptySet()).contains(normalizedMimeType)) {
            return false;
        }
        return signatureMatches(extension, signature);
    }

    private Set<String> parseExtensions(String value) {
        if (!StringUtils.hasText(value)) {
            return Collections.emptySet();
        }
        return Arrays.stream(value.split(","))
                .map(item -> item.trim().toLowerCase(Locale.ROOT))
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());
    }

    private String extensionOf(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int separator = fileName.lastIndexOf('.');
        return separator < 0 ? "" : fileName.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeMimeType(String mimeType) {
        if (!StringUtils.hasText(mimeType)) {
            return "";
        }
        return mimeType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private boolean signatureMatches(String extension, byte[] bytes) {
        if (bytes == null) {
            return false;
        }
        switch (extension) {
            case "jpg":
            case "jpeg":
                return startsWith(bytes, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "png":
                return startsWith(bytes, new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            case "webp":
                return bytes.length >= 12
                        && startsWith(bytes, "RIFF".getBytes(StandardCharsets.US_ASCII))
                        && Arrays.equals(Arrays.copyOfRange(bytes, 8, 12), "WEBP".getBytes(StandardCharsets.US_ASCII));
            case "pdf":
                return startsWith(bytes, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "docx":
            case "xlsx":
            case "pptx":
            case "zip":
                return startsWith(bytes, new byte[] {0x50, 0x4b});
            case "txt":
            case "md":
            case "csv":
                for (byte value : bytes) {
                    if (value == 0) {
                        return false;
                    }
                }
                return true;
            default:
                return false;
        }
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        return value.length >= prefix.length && Arrays.equals(Arrays.copyOf(value, prefix.length), prefix);
    }
}
