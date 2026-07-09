package com.xxx.pai.mlp.man.documentcenter.infra.util;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class DocumentContentAssetExtractor {

    private static final String NODE_TYPE_IMAGE = "image";
    private static final String NODE_TYPE_ATTACHMENT = "attachment";

    public Set<Long> extractAssetIds(Map<String, Object> content) {
        Set<Long> assetIds = new LinkedHashSet<>();
        collectAssetIds(content, assetIds);
        return assetIds;
    }

    @SuppressWarnings("unchecked")
    private void collectAssetIds(Object value, Set<Long> assetIds) {
        if (value instanceof Map) {
            Map<String, Object> node = (Map<String, Object>) value;
            Object type = node.get("type");
            if (NODE_TYPE_IMAGE.equals(type) || NODE_TYPE_ATTACHMENT.equals(type)) {
                addAssetId(node.get("assetId"), assetIds);
                Object attrs = node.get("attrs");
                if (attrs instanceof Map) {
                    addAssetId(((Map<String, Object>) attrs).get("assetId"), assetIds);
                }
            }
            for (Object child : node.values()) {
                collectAssetIds(child, assetIds);
            }
            return;
        }
        if (value instanceof Collection) {
            for (Object item : (Collection<?>) value) {
                collectAssetIds(item, assetIds);
            }
        }
    }

    private void addAssetId(Object rawAssetId, Set<Long> assetIds) {
        if (rawAssetId instanceof Number) {
            assetIds.add(((Number) rawAssetId).longValue());
            return;
        }
        if (rawAssetId instanceof String) {
            try {
                assetIds.add(Long.parseLong(((String) rawAssetId).trim()));
            } catch (NumberFormatException ignored) {
                // Content validation will reject unresolved assets by ownership check.
            }
        }
    }
}
