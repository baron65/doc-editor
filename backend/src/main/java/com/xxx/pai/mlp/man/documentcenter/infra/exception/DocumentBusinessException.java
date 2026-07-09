package com.xxx.pai.mlp.man.documentcenter.infra.exception;

public class DocumentBusinessException extends RuntimeException {

    private final DocumentErrorCode errorCode;

    public DocumentBusinessException(DocumentErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public DocumentErrorCode getErrorCode() {
        return errorCode;
    }
}

