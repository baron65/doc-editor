package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class DirectoryDTO {

    @NotBlank
    private String name;

    @NotNull
    private Long parentId;

    private Long expectedTreeRevision;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

