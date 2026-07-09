package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class DocumentDTO {

    @NotBlank
    private String title;

    @NotNull
    private Long parentId;

    private Long expectedTreeRevision;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public Long getExpectedTreeRevision() {
        return expectedTreeRevision;
    }

    public void setExpectedTreeRevision(Long expectedTreeRevision) {
        this.expectedTreeRevision = expectedTreeRevision;
    }
}

