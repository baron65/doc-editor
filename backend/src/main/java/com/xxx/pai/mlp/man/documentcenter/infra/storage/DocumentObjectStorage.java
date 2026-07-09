package com.xxx.pai.mlp.man.documentcenter.infra.storage;

import java.io.IOException;
import java.io.InputStream;

public interface DocumentObjectStorage {

    StoredObject put(String storageKey, InputStream stream, long declaredSize, String contentType) throws IOException;

    ObjectStream get(String storageKey) throws IOException;

    void delete(String storageKey) throws IOException;
}

