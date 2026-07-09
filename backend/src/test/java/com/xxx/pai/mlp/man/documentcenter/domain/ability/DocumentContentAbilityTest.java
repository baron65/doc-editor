package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import static org.assertj.core.api.Assertions.assertThat;

import com.xxx.pai.mlp.man.documentcenter.domain.bo.ContentValidationResultBO;
import org.junit.jupiter.api.Test;

class DocumentContentAbilityTest {

    @Test
    void validateDraftContentRejectsOversizedMermaidSource() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String oversizedSource = "a".repeat(50 * 1024 + 1);
        String contentJson = "{\"type\":\"doc\",\"content\":[{\"type\":\"mermaid\",\"attrs\":{\"source\":\""
                + oversizedSource
                + "\"}}]}";

        ContentValidationResultBO result = ability.validateDraftContent(1, contentJson);

        assertThat(result.isValid()).isFalse();
        assertThat(result.getReason()).contains("Mermaid");
    }

    @Test
    void validateDraftContentRejectsTooManyMermaidBlocks() {
        DocumentContentAbility ability = new DocumentContentAbility();
        StringBuilder contentJson = new StringBuilder("{\"type\":\"doc\",\"content\":[");
        for (int index = 0; index < 51; index++) {
            if (index > 0) {
                contentJson.append(',');
            }
            contentJson.append("{\"type\":\"mermaid\",\"attrs\":{\"source\":\"graph TD A-->B\"}}");
        }
        contentJson.append("]}");

        ContentValidationResultBO result = ability.validateDraftContent(1, contentJson.toString());

        assertThat(result.isValid()).isFalse();
        assertThat(result.getReason()).contains("Mermaid");
    }
}
