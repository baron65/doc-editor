package com.xxx.pai.mlp.man.documentcenter.infra.exception;

public enum DocumentErrorCode {
    VALIDATION_FAILED("DOC_VALIDATION_FAILED"),
    NOT_FOUND("DOC_NOT_FOUND"),
    CONFLICT("DOC_CONFLICT"),
    STORAGE_ERROR("DOC_STORAGE_ERROR"),
    INTERNAL_ERROR("DOC_INTERNAL_ERROR");

    private final String code;

    DocumentErrorCode(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

