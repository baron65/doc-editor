package com.xxx.pai.mlp.man.documentcenter.client.vo;

import java.util.Map;

public class PublishedDocumentDetailVO {

    private String documentId;
    private String title;
    private Integer schemaVersion;
    private Map<String, Object> content;
    private String publishedRevision;
    private String publicationVersion;

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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
}

