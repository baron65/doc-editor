package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class DocumentAssetAbilityTest {

    private final DocumentAssetAbility ability = new DocumentAssetAbility();

    @Test
    void acceptsConfiguredImageExtensionMimeAndSignatureTogether() {
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        assertThat(ability.isAllowedType("IMAGE", "architecture.png", "image/png", png)).isTrue();
    }

    @Test
    void rejectsSvgAndExecutableHtmlEvenWhenDeclaredAsAnImage() {
        assertThat(ability.isAllowedType(
                "IMAGE", "diagram.svg", "image/svg+xml", "<svg>".getBytes(StandardCharsets.UTF_8))).isFalse();
        assertThat(ability.isAllowedType(
                "IMAGE", "fake.png", "image/png", "<html>".getBytes(StandardCharsets.UTF_8))).isFalse();
    }

    @Test
    void acceptsConfiguredAttachmentAndRejectsExecutableExtension() {
        assertThat(ability.isAllowedType(
                "ATTACHMENT", "guide.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII))).isTrue();
        assertThat(ability.isAllowedType(
                "ATTACHMENT", "run.exe", "application/octet-stream", new byte[] {0x4d, 0x5a})).isFalse();
    }
}
