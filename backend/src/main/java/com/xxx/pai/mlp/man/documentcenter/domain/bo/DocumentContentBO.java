package com.xxx.pai.mlp.man.documentcenter.domain.bo;

public class DocumentContentBO {

    private Integer schemaVersion;
    private String contentJson;

    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public String getContentJson() {
        return contentJson;
    }

    public void setContentJson(String contentJson) {
        this.contentJson = contentJson;
    }
}

