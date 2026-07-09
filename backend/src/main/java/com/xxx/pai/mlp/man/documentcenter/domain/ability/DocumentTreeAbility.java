package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import org.springframework.stereotype.Component;

@Component
public class DocumentTreeAbility {

    public boolean isValidDepth(int depth) {
        return depth >= 0 && depth <= 4;
    }
}

