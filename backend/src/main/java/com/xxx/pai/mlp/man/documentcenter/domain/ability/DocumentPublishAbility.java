package com.xxx.pai.mlp.man.documentcenter.domain.ability;

import org.springframework.stereotype.Component;

@Component
public class DocumentPublishAbility {

    public boolean canPublish(Long expectedDraftRevision, Long currentDraftRevision) {
        return expectedDraftRevision != null && expectedDraftRevision.equals(currentDraftRevision);
    }
}

