package com.xxx.pai.mlp.man.documentcenter.client.dto;

import java.util.Map;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class DocumentDraftDTO {

    @NotBlank
    private String title;

    @NotNull
    private Integer schemaVersion;

    @NotNull
    private Map<String, Object> content;

    @NotNull
    private Long expectedDraftRevision;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public Map<String, Object> getContent() {
        return content;
    }

    public void setContent(Map<String, Object> content) {
        this.content = content;
    }

    public Long getExpectedDraftRevision() {
        return expectedDraftRevision;
    }

    public void setExpectedDraftRevision(Long expectedDraftRevision) {
        this.expectedDraftRevision = expectedDraftRevision;
    }
}

