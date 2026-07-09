package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import org.springframework.stereotype.Component;

@Component
public class DocumentAssetAbility {

    public boolean isAllowedSize(String assetKind, long sizeBytes) {
        if ("IMAGE".equals(assetKind)) {
            return sizeBytes <= 10L * 1024L * 1024L;
        }
        return sizeBytes <= 50L * 1024L * 1024L;
    }
}

