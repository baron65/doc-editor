package com.xxx.pai.mlp.man.documentcenter.infra.storage;

import com.xxx.pai.mlp.man.documentcenter.infra.config.DocumentCenterProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;

@Component
@ConditionalOnProperty(prefix = "document-center.storage", name = "type", havingValue = "local")
public class LocalDocumentObjectStorage implements DocumentObjectStorage {

    private final DocumentCenterProperties properties;

    public LocalDocumentObjectStorage(DocumentCenterProperties properties) {
        this.properties = properties;
    }

    @Override
    public StoredObject put(String storageKey, InputStream stream, long declaredSize, String contentType) throws IOException {
        Path target = resolve(storageKey);
        Files.createDirectories(target.getParent());
        long copied = Files.copy(stream, target, StandardCopyOption.REPLACE_EXISTING);
        if (declaredSize >= 0 && copied != declaredSize) {
            Files.deleteIfExists(target);
            throw new IOException("Stored object size mismatch");
        }
        return new StoredObject(storageKey, copied, contentType, properties.getStorage().getPublicBasePath() + "/" + encodeStorageKey(storageKey));
    }

    @Override
    public ObjectStream get(String storageKey) throws IOException {
        Path target = resolve(storageKey);
        return new ObjectStream(Files.newInputStream(target), "application/octet-stream", Files.size(target));
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        if (!StringUtils.hasText(storageKey)) {
            throw new IllegalArgumentException("Storage key must not be blank");
        }
        Path root = Paths.get(properties.getStorage().getRootPath()).normalize();
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return target;
    }

    private String encodeStorageKey(String storageKey) {
        return Arrays.stream(storageKey.split("/"))
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .collect(Collectors.joining("/"));
    }
}
