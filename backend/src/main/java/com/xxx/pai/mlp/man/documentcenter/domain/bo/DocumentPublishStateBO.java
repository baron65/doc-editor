package com.xxx.pai.mlp.man.documentcenter.domain.bo;

public class DocumentPublishStateBO {

    private boolean published;
    private Long draftRevision;
    private Long publishedRevision;
    private Long publicationVersion;

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public Long getDraftRevision() {
        return draftRevision;
    }

    public void setDraftRevision(Long draftRevision) {
        this.draftRevision = draftRevision;
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
}

