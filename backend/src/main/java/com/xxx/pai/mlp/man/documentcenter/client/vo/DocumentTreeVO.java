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
        private String parentId;
        private String nodeType;
        private String title;
        private Integer sortOrder;
        private Boolean published;
        private List<TreeNodeVO> children = new ArrayList<>();

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
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

