package com.xxx.pai.mlp.man.documentcenter.infra.util;

import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class DocumentIdGenerator {

    private final AtomicLong sequence = new AtomicLong(System.currentTimeMillis() * 1000);

    public long nextId() {
        return sequence.incrementAndGet();
    }
}
