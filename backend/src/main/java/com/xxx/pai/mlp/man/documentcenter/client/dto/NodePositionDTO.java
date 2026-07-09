package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

public class NodePositionDTO {

    @NotNull
    private Long targetParentId;

    @NotNull
    @Min(0)
    private Integer targetIndex;

    @NotNull
    private Long expectedTreeRevision;

    public Long getTargetParentId() {
        return targetParentId;
    }

    public void setTargetParentId(Long targetParentId) {
        this.targetParentId = targetParentId;
    }

    public Integer getTargetIndex() {
        return targetIndex;
    }

    public void setTargetIndex(Integer targetIndex) {
        this.targetIndex = targetIndex;
    }

    public Long getExpectedTreeRevision() {
        return expectedTreeRevision;
    }

    public void setExpectedTreeRevision(Long expectedTreeRevision) {
        this.expectedTreeRevision = expectedTreeRevision;
    }
}
