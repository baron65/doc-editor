package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.NotNull;

public class DocumentPublishDTO {

    @NotNull
    private Long expectedDraftRevision;

    private Long expectedPublicationVersion;

    public Long getExpectedDraftRevision() {
        return expectedDraftRevision;
    }

    public void setExpectedDraftRevision(Long expectedDraftRevision) {
        this.expectedDraftRevision = expectedDraftRevision;
    }

    public Long getExpectedPublicationVersion() {
        return expectedPublicationVersion;
    }

    public void setExpectedPublicationVersion(Long expectedPublicationVersion) {
        this.expectedPublicationVersion = expectedPublicationVersion;
    }
}

