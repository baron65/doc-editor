package com.xxx.pai.mlp.man.documentcenter.infra.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class DocumentJsonUtils {

    private final ObjectMapper objectMapper;

    public DocumentJsonUtils(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String toJson(Map<String, Object> content) throws JsonProcessingException {
        return objectMapper.writeValueAsString(content);
    }

    public Map<String, Object> fromJson(String contentJson) {
        if (contentJson == null || contentJson.isBlank()) {
            return emptyDocumentContent();
        }
        try {
            return objectMapper.readValue(contentJson, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("failed to parse document content json", exception);
        }
    }

    public Map<String, Object> emptyDocumentContent() {
        return Map.of("type", "doc", "content", Collections.<Object>emptyList());
    }
}
