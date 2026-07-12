package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import java.text.Normalizer;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DocumentNameAbility {

    public String normalizeNameKey(String name) {
        if (!StringUtils.hasText(name)) {
            return "";
        }
        return Normalizer.normalize(name, Normalizer.Form.NFKC)
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
