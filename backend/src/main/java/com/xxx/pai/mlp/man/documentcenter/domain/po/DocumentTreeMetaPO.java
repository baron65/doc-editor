package com.xxx.pai.mlp.man.documentcenter.domain.po;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("doc_tree_meta")
public class DocumentTreeMetaPO {

    @TableId
    private Integer metaId;
    private Long treeRevision;
    private LocalDateTime updatedAt;

    public Integer getMetaId() {
        return metaId;
    }

    public void setMetaId(Integer metaId) {
        this.metaId = metaId;
    }

    public Long getTreeRevision() {
        return treeRevision;
    }

    public void setTreeRevision(Long treeRevision) {
        this.treeRevision = treeRevision;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

