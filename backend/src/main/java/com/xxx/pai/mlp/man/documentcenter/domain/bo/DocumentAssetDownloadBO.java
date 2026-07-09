package com.xxx.pai.mlp.man.documentcenter.domain.bo;

import java.io.InputStream;

public class DocumentAssetDownloadBO {

    private final InputStream inputStream;
    private final String originalName;
    private final String mimeType;
    private final long sizeBytes;
    private final boolean inline;

    public DocumentAssetDownloadBO(
            InputStream inputStream,
            String originalName,
            String mimeType,
            long sizeBytes,
            boolean inline) {
        this.inputStream = inputStream;
        this.originalName = originalName;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.inline = inline;
    }

    public InputStream getInputStream() {
        return inputStream;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public boolean isInline() {
        return inline;
    }
}
