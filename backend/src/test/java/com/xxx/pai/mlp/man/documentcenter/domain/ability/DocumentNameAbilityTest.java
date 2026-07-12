package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import org.junit.jupiter.api.Test;

class DocumentNameAbilityTest {

    private final DocumentNameAbility ability = new DocumentNameAbility();

    @Test
    void normalizesUnicodeWidthWhitespaceAndCaseWithLocaleRoot() {
        Locale previous = Locale.getDefault();
        Locale.setDefault(new Locale("tr", "TR"));
        try {
            assertThat(ability.normalizeNameKey("  ＡI Infra  ")).isEqualTo("ai infra");
        } finally {
            Locale.setDefault(previous);
        }
    }
}
