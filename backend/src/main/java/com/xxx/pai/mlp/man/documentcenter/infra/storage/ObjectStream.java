package com.xxx.pai.mlp.man.documentcenter.infra.storage;

import java.io.InputStream;

public class ObjectStream {

    private final InputStream inputStream;
    private final String contentType;
    private final long sizeBytes;

    public ObjectStream(InputStream inputStream, String contentType, long sizeBytes) {
        this.inputStream = inputStream;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    public InputStream getInputStream() {
        return inputStream;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }
}

