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
    void acceptsSafeMarkdownAttachmentLinksAndRejectsUnsafeProtocols() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String safe = "{\"type\":\"doc\",\"content\":[{\"type\":\"attachment\",\"attrs\":{"
                + "\"assetId\":null,\"href\":\"https://example.com/files/guide.pdf\","
                + "\"originalName\":\"guide.pdf\",\"mimeType\":\"application/pdf\",\"sizeBytes\":\"0\"}}]}";
        String unsafe = "{\"type\":\"doc\",\"content\":[{\"type\":\"attachment\",\"attrs\":{"
                + "\"assetId\":null,\"href\":\"javascript:alert(1)\","
                + "\"originalName\":\"guide.pdf\",\"mimeType\":\"application/pdf\",\"sizeBytes\":\"0\"}}]}";

        assertThat(ability.validateDraftContent(1, safe).isValid()).isTrue();
        ContentValidationResultBO unsafeResult = ability.validateDraftContent(1, unsafe);
        assertThat(unsafeResult.isValid()).isFalse();
        assertThat(unsafeResult.getReason()).contains("attachment link protocol");
    }

    @Test
    void acceptsSafeAlignmentIndentAndTextColor() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":[{"
                + "\"type\":\"paragraph\",\"attrs\":{\"textAlign\":\"center\",\"indent\":2},"
                + "\"content\":[{\"type\":\"text\",\"text\":\"蓝色文字\","
                + "\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#2563eb\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, content).isValid()).isTrue();
    }

    @Test
    void acceptsTextColorAndFontSizeAsIndependentTextStyleAttributes() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"蓝色\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"color\":\"#2563eb\",\"fontSize\":null}}]},"
                + "{\"type\":\"text\",\"text\":\"大字\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"color\":null,\"fontSize\":\"18px\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, content).isValid()).isTrue();
    }

    @Test
    void acceptsControlledTextBackgroundColor() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{"
                + "\"type\":\"text\",\"text\":\"高亮\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"backgroundColor\":\"#fff2cc\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, content).isValid()).isTrue();
    }

    @Test
    void acceptsCommonSafeTextStylesFromPastedContent() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{"
                + "\"type\":\"text\",\"text\":\"粘贴文本\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"color\":\"rgb(30, 64, 175)\",\"backgroundColor\":\"rgba(30, 64, 175, 0.2)\",\"fontSize\":\"1.25rem\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, content).isValid()).isTrue();
    }

    @Test
    void rejectsTextStyleInjectionAndExtremeFontSizes() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String injectedColor = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{"
                + "\"type\":\"text\",\"text\":\"危险\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"color\":\"red; background: black\"}}]}]}]}";
        String extremeFontSize = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{"
                + "\"type\":\"text\",\"text\":\"危险\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"fontSize\":\"300px\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, injectedColor).isValid()).isFalse();
        assertThat(ability.validateDraftContent(1, extremeFontSize).isValid()).isFalse();
    }

    @Test
    void rejectsUnsupportedFontSize() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String content = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{"
                + "\"type\":\"text\",\"text\":\"危险字号\",\"marks\":[{\"type\":\"textStyle\","
                + "\"attrs\":{\"fontSize\":\"calc(100vw)\"}}]}]}]}";

        ContentValidationResultBO result = ability.validateDraftContent(1, content);

        assertThat(result.isValid()).isFalse();
        assertThat(result.getReason()).contains("font size");
    }

    @Test
    void rejectsUnsafeAlignmentIndentAndTextColor() {
        DocumentContentAbility ability = new DocumentContentAbility();
        String unsafeAlignment = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\","
                + "\"attrs\":{\"textAlign\":\"expression(alert(1))\"}}]}";
        String unsafeIndent = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\","
                + "\"attrs\":{\"indent\":99}}]}";
        String unsafeColor = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\","
                + "\"content\":[{\"type\":\"text\",\"text\":\"危险\",\"marks\":[{"
                + "\"type\":\"textStyle\",\"attrs\":{\"color\":\"url(javascript:alert(1))\"}}]}]}]}";

        assertThat(ability.validateDraftContent(1, unsafeAlignment).isValid()).isFalse();
        assertThat(ability.validateDraftContent(1, unsafeIndent).isValid()).isFalse();
        assertThat(ability.validateDraftContent(1, unsafeColor).isValid()).isFalse();
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
