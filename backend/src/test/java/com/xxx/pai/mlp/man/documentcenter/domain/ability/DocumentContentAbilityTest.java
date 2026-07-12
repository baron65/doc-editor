package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import static org.assertj.core.api.Assertions.assertThat;

import com.xxx.pai.mlp.man.documentcenter.domain.bo.ContentValidationResultBO;
import org.junit.jupiter.api.Test;

class DocumentContentAbilityTest {

    @Test
    void rejectsUnknownNodesAndDangerousLinkProtocols() {
        DocumentContentAbility ability = new DocumentContentAbility();
        ContentValidationResultBO iframe = ability.validateDraftContent(
                1, "{\"type\":\"doc\",\"content\":[{\"type\":\"iframe\",\"attrs\":{\"src\":\"https://example.com\"}}]}");
        ContentValidationResultBO javascriptLink = ability.validateDraftContent(
                1,
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"click\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]}]}]}");

        assertThat(iframe.isValid()).isFalse();
        assertThat(iframe.getReason()).contains("node type");
        assertThat(javascriptLink.isValid()).isFalse();
        assertThat(javascriptLink.getReason()).contains("link protocol");
    }

    @Test
    void acceptsControlledRichTextAndHttpsLinks() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"heading\",\"attrs\":{\"level\":2},\"content\":[{\"type\":\"text\",\"text\":\"指南\"}]},"
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"官网\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://example.com/docs\"}}]}]}"
                + "]}";

        assertThat(ability.validateDraftContent(1, content).isValid()).isTrue();
    }

    @Test
    void reportsUtf8ContentSizeViolationsSeparatelyFromSchemaErrors() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String oversized = "{\"type\":\"doc\",\"content\":[{\"type\":\"text\",\"text\":\""
                + "中".repeat(700_000)
                + "\"}]}";

        ContentValidationResultBO result = ability.validateDraftContent(1, oversized);

        assertThat(result.isValid()).isFalse();
        assertThat(result.isTooLarge()).isTrue();
    }

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
