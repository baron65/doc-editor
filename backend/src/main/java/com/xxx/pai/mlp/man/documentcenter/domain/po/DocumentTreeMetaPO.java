package com.xxx.pai.mlp.man.documentcenter.domain.po;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("doc_tree_meta")
public class DocumentTreeMetaPO {

    @TableId(type = IdType.INPUT)
    private Integer metaId;
    private Long treeRevision;
    private LocalDateTime updateTime;
    @TableLogic(value = "0", delval = "1")
    private Integer isDeleted;
    private Long deletorId;
    private LocalDateTime deleteTime;

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

    public LocalDateTime getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(LocalDateTime updateTime) {
        this.updateTime = updateTime;
    }

    public Integer getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(Integer isDeleted) {
        this.isDeleted = isDeleted;
    }

    public Long getDeletorId() {
        return deletorId;
    }

    public void setDeletorId(Long deletorId) {
        this.deletorId = deletorId;
    }

    public LocalDateTime getDeleteTime() {
        return deleteTime;
    }

    public void setDeleteTime(LocalDateTime deleteTime) {
        this.deleteTime = deleteTime;
    }
}
