package com.xxx.pai.mlp.man.documentcenter.domain.po;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("doc_node")
public class DocumentNodePO {

    @TableId
    private Long id;
    private Long parentId;
    private String nodeType;
    private String draftName;
    private String draftNameKey;
    private String publishedName;
    private String publishedNameKey;
    private Integer sortOrder;
    private Long nodeVersion;
    private Long creatorId;
    private LocalDateTime createTime;
    private Long updatorId;
    private LocalDateTime updateTime;
    @TableLogic(value = "0", delval = "1")
    private Integer isDeleted;
    private Long deletorId;
    private LocalDateTime deleteTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public String getNodeType() {
        return nodeType;
    }

    public void setNodeType(String nodeType) {
        this.nodeType = nodeType;
    }

    public String getDraftName() {
        return draftName;
    }

    public void setDraftName(String draftName) {
        this.draftName = draftName;
    }

    public String getDraftNameKey() {
        return draftNameKey;
    }

    public void setDraftNameKey(String draftNameKey) {
        this.draftNameKey = draftNameKey;
    }

    public String getPublishedName() {
        return publishedName;
    }

    public void setPublishedName(String publishedName) {
        this.publishedName = publishedName;
    }

    public String getPublishedNameKey() {
        return publishedNameKey;
    }

    public void setPublishedNameKey(String publishedNameKey) {
        this.publishedNameKey = publishedNameKey;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Long getNodeVersion() {
        return nodeVersion;
    }

    public void setNodeVersion(Long nodeVersion) {
        this.nodeVersion = nodeVersion;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public LocalDateTime getCreateTime() {
        return createTime;
    }

    public void setCreateTime(LocalDateTime createTime) {
        this.createTime = createTime;
    }

    public Long getUpdatorId() {
        return updatorId;
    }

    public void setUpdatorId(Long updatorId) {
        this.updatorId = updatorId;
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
