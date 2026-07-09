package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DocumentNameAbility {

    public String normalizeNameKey(String name) {
        if (!StringUtils.hasText(name)) {
            return "";
        }
        return name.trim().toLowerCase();
    }
}

