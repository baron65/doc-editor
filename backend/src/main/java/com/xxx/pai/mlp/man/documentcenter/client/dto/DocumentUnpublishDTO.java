package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.NotNull;

public class DocumentUnpublishDTO {

    @NotNull
    private Long expectedPublicationVersion;

    public Long getExpectedPublicationVersion() {
        return expectedPublicationVersion;
    }

    public void setExpectedPublicationVersion(Long expectedPublicationVersion) {
        this.expectedPublicationVersion = expectedPublicationVersion;
    }
}
