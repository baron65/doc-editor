package com.xxx.pai.mlp.man.documentcenter.domain.bo;

public class ContentValidationResultBO {

    private final boolean valid;
    private final String reason;
    private final boolean tooLarge;

    private ContentValidationResultBO(boolean valid, String reason, boolean tooLarge) {
        this.valid = valid;
        this.reason = reason;
        this.tooLarge = tooLarge;
    }

    public static ContentValidationResultBO valid() {
        return new ContentValidationResultBO(true, null, false);
    }

    public static ContentValidationResultBO invalid(String reason) {
        return new ContentValidationResultBO(false, reason, false);
    }

    public static ContentValidationResultBO tooLarge(String reason) {
        return new ContentValidationResultBO(false, reason, true);
    }

    public boolean isValid() {
        return valid;
    }

    public String getReason() {
        return reason;
    }

    public boolean isTooLarge() {
        return tooLarge;
    }
}
