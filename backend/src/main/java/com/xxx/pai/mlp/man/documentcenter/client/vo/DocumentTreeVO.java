package com.xxx.pai.mlp.man.documentcenter.client.vo;

import java.util.ArrayList;
import java.util.List;

public class DocumentTreeVO {

    private String treeRevision;
    private String defaultDocumentId;
    private List<TreeNodeVO> nodes = new ArrayList<>();

    public String getTreeRevision() {
        return treeRevision;
    }

    public void setTreeRevision(String treeRevision) {
        this.treeRevision = treeRevision;
    }

    public String getDefaultDocumentId() {
        return defaultDocumentId;
    }

    public void setDefaultDocumentId(String defaultDocumentId) {
        this.defaultDocumentId = defaultDocumentId;
    }

    public List<TreeNodeVO> getNodes() {
        return nodes;
    }

    public void setNodes(List<TreeNodeVO> nodes) {
        this.nodes = nodes;
    }

    public static class TreeNodeVO {
        private String id;
        private String nodeId;
        private String parentId;
        private String nodeType;
        private String title;
        private String name;
        private String draftTitle;
        private String publishedTitle;
        private String publishState;
        private String publishedRevision;
        private Integer sortOrder;
        private Boolean published;
        private List<TreeNodeVO> children = new ArrayList<>();

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

        public String getParentId() {
            return parentId;
        }

        public void setParentId(String parentId) {
            this.parentId = parentId;
        }

        public String getNodeType() {
            return nodeType;
        }

        public void setNodeType(String nodeType) {
            this.nodeType = nodeType;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
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

        public String getPublishedRevision() {
            return publishedRevision;
        }

        public void setPublishedRevision(String publishedRevision) {
            this.publishedRevision = publishedRevision;
        }

        public Integer getSortOrder() {
            return sortOrder;
        }

        public void setSortOrder(Integer sortOrder) {
            this.sortOrder = sortOrder;
        }

        public Boolean getPublished() {
            return published;
        }

        public void setPublished(Boolean published) {
            this.published = published;
        }

        public List<TreeNodeVO> getChildren() {
            return children;
        }

        public void setChildren(List<TreeNodeVO> children) {
            this.children = children;
        }
    }
}
