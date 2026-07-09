package com.xxx.pai.mlp.man.documentcenter.infra.storage;

public class StoredObject {

    private final String storageKey;
    private final long sizeBytes;
    private final String contentType;
    private final String accessUrl;

    public StoredObject(String storageKey, long sizeBytes, String contentType, String accessUrl) {
        this.storageKey = storageKey;
        this.sizeBytes = sizeBytes;
        this.contentType = contentType;
        this.accessUrl = accessUrl;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getContentType() {
        return contentType;
    }

    public String getAccessUrl() {
        return accessUrl;
    }
}

