package com.xxx.pai.mlp.man.documentcenter.domain.po;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("doc_asset_ref")
public class DocumentAssetRefPO {

    private Long documentId;
    private Long assetId;
    private String refScope;
    private LocalDateTime createdAt;

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public Long getAssetId() {
        return assetId;
    }

    public void setAssetId(Long assetId) {
        this.assetId = assetId;
    }

    public String getRefScope() {
        return refScope;
    }

    public void setRefScope(String refScope) {
        this.refScope = refScope;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

