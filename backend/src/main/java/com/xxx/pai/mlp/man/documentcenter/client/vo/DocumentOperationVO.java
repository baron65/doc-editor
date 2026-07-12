package com.xxx.pai.mlp.man.documentcenter.client.vo;

public class DocumentOperationVO {

    private String id;
    private String nodeId;
    private String documentId;
    private String draftRevision;
    private String publishedRevision;
    private String publicationVersion;
    private String treeRevision;
    private String publishState;
    private Boolean alreadyUnpublished;
    private String parentId;
    private Integer sortOrder;
    private Boolean publishedNavigationChanged;

    public static DocumentOperationVO empty() {
        return new DocumentOperationVO();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
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

    public String getTreeRevision() {
        return treeRevision;
    }

    public void setTreeRevision(String treeRevision) {
        this.treeRevision = treeRevision;
    }

    public String getPublishState() {
        return publishState;
    }

    public void setPublishState(String publishState) {
        this.publishState = publishState;
    }

    public Boolean getAlreadyUnpublished() {
        return alreadyUnpublished;
    }

    public void setAlreadyUnpublished(Boolean alreadyUnpublished) {
        this.alreadyUnpublished = alreadyUnpublished;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Boolean getPublishedNavigationChanged() {
        return publishedNavigationChanged;
    }

    public void setPublishedNavigationChanged(Boolean publishedNavigationChanged) {
        this.publishedNavigationChanged = publishedNavigationChanged;
    }
}
