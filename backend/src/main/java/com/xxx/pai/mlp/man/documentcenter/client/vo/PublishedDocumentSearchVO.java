package com.xxx.pai.mlp.man.documentcenter.client.vo;

import java.util.ArrayList;
import java.util.List;

public class PublishedDocumentSearchVO {

    private String keyword;
    private List<SearchItemVO> items = new ArrayList<>();

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public List<SearchItemVO> getItems() {
        return items;
    }

    public void setItems(List<SearchItemVO> items) {
        this.items = items;
    }

    public static class SearchItemVO {
        private String documentId;
        private String title;
        private List<String> breadcrumb = new ArrayList<>();

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

        public List<String> getBreadcrumb() {
            return breadcrumb;
        }

        public void setBreadcrumb(List<String> breadcrumb) {
            this.breadcrumb = breadcrumb;
        }
    }
}
