package com.xxx.pai.mlp.man.documentcenter.domain.po;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("doc_document")
public class DocumentPO {

    @TableId(type = IdType.INPUT)
    private Long documentId;
    private Integer draftSchemaVersion;
    private String draftContentJson;
    private Long draftRevision;
    private Integer publishedSchemaVersion;
    private String publishedContentJson;
    private Long publishedRevision;
    private Long publicationVersion;
    private Integer isPublished;
    private Long draftUpdatedBy;
    private LocalDateTime draftUpdatedAt;
    private Long publishedBy;
    private LocalDateTime publishedAt;
    @TableLogic(value = "0", delval = "1")
    private Integer isDeleted;
    private Long deletorId;
    private LocalDateTime deleteTime;

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public Integer getDraftSchemaVersion() {
        return draftSchemaVersion;
    }

    public void setDraftSchemaVersion(Integer draftSchemaVersion) {
        this.draftSchemaVersion = draftSchemaVersion;
    }

    public String getDraftContentJson() {
        return draftContentJson;
    }

    public void setDraftContentJson(String draftContentJson) {
        this.draftContentJson = draftContentJson;
    }

    public Long getDraftRevision() {
        return draftRevision;
    }

    public void setDraftRevision(Long draftRevision) {
        this.draftRevision = draftRevision;
    }

    public Integer getPublishedSchemaVersion() {
        return publishedSchemaVersion;
    }

    public void setPublishedSchemaVersion(Integer publishedSchemaVersion) {
        this.publishedSchemaVersion = publishedSchemaVersion;
    }

    public String getPublishedContentJson() {
        return publishedContentJson;
    }

    public void setPublishedContentJson(String publishedContentJson) {
        this.publishedContentJson = publishedContentJson;
    }

    public Long getPublishedRevision() {
        return publishedRevision;
    }

    public void setPublishedRevision(Long publishedRevision) {
        this.publishedRevision = publishedRevision;
    }

    public Long getPublicationVersion() {
        return publicationVersion;
    }

    public void setPublicationVersion(Long publicationVersion) {
        this.publicationVersion = publicationVersion;
    }

    public Integer getIsPublished() {
        return isPublished;
    }

    public void setIsPublished(Integer isPublished) {
        this.isPublished = isPublished;
    }

    public Long getDraftUpdatedBy() {
        return draftUpdatedBy;
    }

    public void setDraftUpdatedBy(Long draftUpdatedBy) {
        this.draftUpdatedBy = draftUpdatedBy;
    }

    public LocalDateTime getDraftUpdatedAt() {
        return draftUpdatedAt;
    }

    public void setDraftUpdatedAt(LocalDateTime draftUpdatedAt) {
        this.draftUpdatedAt = draftUpdatedAt;
    }

    public Long getPublishedBy() {
        return publishedBy;
    }

    public void setPublishedBy(Long publishedBy) {
        this.publishedBy = publishedBy;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(LocalDateTime publishedAt) {
        this.publishedAt = publishedAt;
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
