package com.xxx.pai.mlp.man.documentcenter.domain.bo;

public class ContentValidationResultBO {

    private final boolean valid;
    private final String reason;

    private ContentValidationResultBO(boolean valid, String reason) {
        this.valid = valid;
        this.reason = reason;
    }

    public static ContentValidationResultBO valid() {
        return new ContentValidationResultBO(true, null);
    }

    public static ContentValidationResultBO invalid(String reason) {
        return new ContentValidationResultBO(false, reason);
    }

    public boolean isValid() {
        return valid;
    }

    public String getReason() {
        return reason;
    }
}

