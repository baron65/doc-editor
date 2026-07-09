package com.xxx.pai.mlp.man.documentcenter.client.dto;

import javax.validation.constraints.NotBlank;

public class DocumentAssetDTO {

    private Long documentId;

    @NotBlank
    private String assetKind;

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public String getAssetKind() {
        return assetKind;
    }

    public void setAssetKind(String assetKind) {
        this.assetKind = assetKind;
    }
}
