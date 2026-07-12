package com.xxx.pai.mlp.man.documentcenter.client.vo;

import java.util.Map;

public class AdminDocumentDetailVO {

    private String documentId;
    private String parentId;
    private String title;
    private String draftTitle;
    private String publishedTitle;
    private String publishState;
    private Integer schemaVersion;
    private Map<String, Object> content;
    private String draftRevision;
    private String publishedRevision;
    private String publicationVersion;
    private Boolean published;
    private String draftUpdatedAt;
    private String publishedAt;

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDraftTitle() {
        return draftTitle;
    }

    public void setDraftTitle(String draftTitle) {
        this.draftTitle = draftTitle;
    }

    public String getPublishedTitle() {
        return publishedTitle;
    }

    public void setPublishedTitle(String publishedTitle) {
        this.publishedTitle = publishedTitle;
    }

    public String getPublishState() {
        return publishState;
    }

    public void setPublishState(String publishState) {
        this.publishState = publishState;
    }

    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public Map<String, Object> getContent() {
        return content;
    }

    public void setContent(Map<String, Object> content) {
        this.content = content;
    }

    public String getDraftRevision() {
        return draftRevision;
    }

    public void setDraftRevision(String draftRevision) {
        this.draftRevision = draftRevision;
    }

    public String getPublishedRevision() {
        return publishedRevision;
    }

    public void setPublishedRevision(String publishedRevision) {
        this.publishedRevision = publishedRevision;
    }

    public String getPublicationVersion() {
        return publicationVersion;
    }

    public void setPublicationVersion(String publicationVersion) {
        this.publicationVersion = publicationVersion;
    }

    public Boolean getPublished() {
        return published;
    }

    public void setPublished(Boolean published) {
        this.published = published;
    }

    public String getDraftUpdatedAt() {
        return draftUpdatedAt;
    }

    public void setDraftUpdatedAt(String draftUpdatedAt) {
        this.draftUpdatedAt = draftUpdatedAt;
    }

    public String getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }
}
