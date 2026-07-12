package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentAssetDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentAssetVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentAssetAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.DocumentAssetDownloadBO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.DocumentObjectStorage;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.ObjectStream;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.StoredObject;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentIdGenerator;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentAssetServiceImpl implements DocumentAssetService {

    private static final String ASSET_KIND_IMAGE = "IMAGE";
    private static final String ASSET_KIND_ATTACHMENT = "ATTACHMENT";
    private static final String ASSET_STATUS_READY = "READY";
    private static final String REF_SCOPE_PUBLISHED = "PUBLISHED";
    private static final long SYSTEM_USER_ID = 0L;

    private final DocumentObjectStorage objectStorage;
    private final DocumentAssetMapper documentAssetMapper;
    private final DocumentAssetRefMapper documentAssetRefMapper;
    private final DocumentAssetAbility documentAssetAbility;
    private final DocumentIdGenerator documentIdGenerator;

    public DocumentAssetServiceImpl(
            DocumentObjectStorage objectStorage,
            DocumentAssetMapper documentAssetMapper,
            DocumentAssetRefMapper documentAssetRefMapper,
            DocumentAssetAbility documentAssetAbility,
            DocumentIdGenerator documentIdGenerator) {
        this.objectStorage = objectStorage;
        this.documentAssetMapper = documentAssetMapper;
        this.documentAssetRefMapper = documentAssetRefMapper;
        this.documentAssetAbility = documentAssetAbility;
        this.documentIdGenerator = documentIdGenerator;
    }

    @Override
    public DocumentAssetVO upload(DocumentAssetDTO dto, MultipartFile file) throws IOException {
        String assetKind = normalizeAssetKind(dto.getAssetKind());
        if (!documentAssetAbility.isAllowedSize(assetKind, file.getSize())) {
            throw new DocumentBusinessException(DocumentErrorCode.FILE_TOO_LARGE, "asset file is too large");
        }
        String originalName = resolveOriginalName(file);
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : "application/octet-stream";
        if (!documentAssetAbility.isAllowedType(assetKind, originalName, contentType, readSignature(file))) {
            throw new DocumentBusinessException(DocumentErrorCode.UNSUPPORTED_FILE_TYPE, "unsupported file extension, mime type or signature");
        }
        Long assetId = documentIdGenerator.nextId();
        String storageKey = "documents/" + dto.getDocumentId() + "/assets/" + assetId + "/" + UUID.randomUUID();
        StoredObject storedObject = objectStorage.put(
                storageKey,
                file.getInputStream(),
                file.getSize(),
                contentType
        );
        LocalDateTime now = LocalDateTime.now();
        DocumentAssetPO assetPO = new DocumentAssetPO();
        assetPO.setId(assetId);
        assetPO.setDocumentId(dto.getDocumentId());
        assetPO.setAssetKind(assetKind);
        assetPO.setStatus(ASSET_STATUS_READY);
        assetPO.setStorageKey(storedObject.getStorageKey());
        assetPO.setOriginalName(originalName);
        assetPO.setFileExtension(resolveFileExtension(assetPO.getOriginalName()));
        assetPO.setMimeType(contentType);
        assetPO.setSizeBytes(storedObject.getSizeBytes());
        assetPO.setCreatedBy(SYSTEM_USER_ID);
        assetPO.setCreatedAt(now);
        assetPO.setUpdatedBy(SYSTEM_USER_ID);
        assetPO.setUpdatedAt(now);
        documentAssetMapper.insert(assetPO);

        DocumentAssetVO asset = new DocumentAssetVO();
        asset.setAssetId(String.valueOf(assetId));
        asset.setDocumentId(String.valueOf(dto.getDocumentId()));
        asset.setAssetKind(assetKind);
        asset.setOriginalName(assetPO.getOriginalName());
        asset.setMimeType(contentType);
        asset.setSizeBytes(String.valueOf(storedObject.getSizeBytes()));
        asset.setAccessUrl("/api/v1/document-center/admin/documents/" + dto.getDocumentId() + "/assets/" + assetId);
        return asset;
    }

    @Override
    public DocumentAssetVO getAdminAsset(Long documentId, Long assetId) {
        DocumentAssetPO asset = requireAsset(documentId, assetId);
        return toAssetVO(asset, "/api/v1/document-center/admin/documents/" + documentId + "/assets/" + assetId);
    }

    @Override
    public DocumentAssetVO getPublishedAsset(Long documentId, Long assetId) {
        DocumentAssetPO asset = requireAsset(documentId, assetId);
        int publishedRefCount = documentAssetRefMapper.countByDocumentAssetScope(documentId, assetId, REF_SCOPE_PUBLISHED);
        if (publishedRefCount <= 0) {
            throw new DocumentBusinessException(DocumentErrorCode.ASSET_NOT_FOUND, "published asset does not exist");
        }
        return toAssetVO(asset, "/api/v1/document-center/documents/" + documentId + "/assets/" + assetId);
    }

    @Override
    public DocumentAssetDownloadBO openAdminAsset(Long documentId, Long assetId) throws IOException {
        DocumentAssetPO asset = requireAsset(documentId, assetId);
        return openAsset(asset);
    }

    @Override
    public DocumentAssetDownloadBO openPublishedAsset(Long documentId, Long assetId) throws IOException {
        DocumentAssetPO asset = requireAsset(documentId, assetId);
        int publishedRefCount = documentAssetRefMapper.countByDocumentAssetScope(documentId, assetId, REF_SCOPE_PUBLISHED);
        if (publishedRefCount <= 0) {
            throw new DocumentBusinessException(DocumentErrorCode.ASSET_NOT_FOUND, "published asset does not exist");
        }
        return openAsset(asset);
    }

    private String normalizeAssetKind(String assetKind) {
        if (!StringUtils.hasText(assetKind)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "assetKind must not be blank");
        }
        String normalizedAssetKind = assetKind.trim().toUpperCase(Locale.ROOT);
        if (!ASSET_KIND_IMAGE.equals(normalizedAssetKind) && !ASSET_KIND_ATTACHMENT.equals(normalizedAssetKind)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "unsupported assetKind");
        }
        return normalizedAssetKind;
    }

    private DocumentAssetPO requireAsset(Long documentId, Long assetId) {
        DocumentAssetPO asset = documentAssetMapper.selectById(assetId);
        if (asset == null
                || !documentId.equals(asset.getDocumentId())
                || !ASSET_STATUS_READY.equals(asset.getStatus())) {
            throw new DocumentBusinessException(DocumentErrorCode.ASSET_NOT_FOUND, "asset does not exist");
        }
        return asset;
    }

    private DocumentAssetVO toAssetVO(DocumentAssetPO asset, String accessUrl) {
        DocumentAssetVO vo = new DocumentAssetVO();
        vo.setAssetId(String.valueOf(asset.getId()));
        vo.setDocumentId(String.valueOf(asset.getDocumentId()));
        vo.setAssetKind(asset.getAssetKind());
        vo.setOriginalName(asset.getOriginalName());
        vo.setMimeType(asset.getMimeType());
        vo.setSizeBytes(String.valueOf(asset.getSizeBytes()));
        vo.setAccessUrl(accessUrl);
        return vo;
    }

    private DocumentAssetDownloadBO openAsset(DocumentAssetPO asset) throws IOException {
        ObjectStream objectStream = objectStorage.get(asset.getStorageKey());
        return new DocumentAssetDownloadBO(
                objectStream.getInputStream(),
                asset.getOriginalName(),
                StringUtils.hasText(asset.getMimeType()) ? asset.getMimeType() : objectStream.getContentType(),
                objectStream.getSizeBytes(),
                ASSET_KIND_IMAGE.equals(asset.getAssetKind()));
    }

    private byte[] readSignature(MultipartFile file) throws IOException {
        byte[] prefix = new byte[16];
        try (InputStream inputStream = file.getInputStream()) {
            int length = inputStream.read(prefix);
            return length < 0 ? new byte[0] : Arrays.copyOf(prefix, length);
        }
    }

    private String resolveOriginalName(MultipartFile file) {
        if (StringUtils.hasText(file.getOriginalFilename())) {
            return file.getOriginalFilename();
        }
        return "unnamed";
    }

    private String resolveFileExtension(String originalName) {
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalName.length() - 1) {
            return null;
        }
        return originalName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }
}
