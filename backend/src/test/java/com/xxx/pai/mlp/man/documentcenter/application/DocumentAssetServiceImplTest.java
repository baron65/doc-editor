package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentAssetDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentAssetVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentAssetAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.DocumentAssetDownloadBO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.DocumentObjectStorage;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.ObjectStream;
import com.xxx.pai.mlp.man.documentcenter.infra.storage.StoredObject;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class DocumentAssetServiceImplTest {

    @Mock
    private DocumentObjectStorage objectStorage;

    @Mock
    private DocumentAssetMapper documentAssetMapper;

    @Mock
    private DocumentAssetRefMapper documentAssetRefMapper;

    @Test
    void uploadStoresObjectAndPersistsReadyAssetMetadata() throws Exception {
        Long assetId = 800L;
        Long documentId = 100L;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "architecture.png",
                "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01});
        when(objectStorage.put(any(String.class), any(InputStream.class), eq(file.getSize()), eq("image/png")))
                .thenAnswer(invocation -> new StoredObject(
                        invocation.getArgument(0),
                        file.getSize(),
                        "image/png",
                        "/api/v1/document-center/assets/" + assetId));
        when(documentAssetMapper.insert(any(DocumentAssetPO.class))).thenAnswer(invocation -> {
            DocumentAssetPO asset = invocation.getArgument(0);
            assertThat(asset.getId()).isNull();
            asset.setId(assetId);
            return 1;
        });

        DocumentAssetServiceImpl service = new DocumentAssetServiceImpl(
                objectStorage,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentAssetAbility());
        DocumentAssetDTO dto = new DocumentAssetDTO();
        dto.setDocumentId(documentId);
        dto.setAssetKind("IMAGE");

        DocumentAssetVO result = service.upload(dto, file);

        ArgumentCaptor<DocumentAssetPO> assetCaptor = ArgumentCaptor.forClass(DocumentAssetPO.class);
        verify(documentAssetMapper).insert(assetCaptor.capture());
        DocumentAssetPO persistedAsset = assetCaptor.getValue();
        assertThat(persistedAsset.getId()).isEqualTo(assetId);
        assertThat(persistedAsset.getDocumentId()).isEqualTo(documentId);
        assertThat(persistedAsset.getAssetKind()).isEqualTo("IMAGE");
        assertThat(persistedAsset.getStatus()).isEqualTo("READY");
        assertThat(persistedAsset.getStorageKey()).contains(String.valueOf(documentId));
        assertThat(persistedAsset.getOriginalName()).isEqualTo("architecture.png");
        assertThat(persistedAsset.getFileExtension()).isEqualTo("png");
        assertThat(persistedAsset.getMimeType()).isEqualTo("image/png");
        assertThat(persistedAsset.getSizeBytes()).isEqualTo(file.getSize());
        assertThat(result.getAssetId()).isEqualTo(String.valueOf(assetId));
        assertThat(result.getDocumentId()).isEqualTo(String.valueOf(documentId));
        assertThat(result.getAccessUrl()).isEqualTo("/api/v1/document-center/admin/documents/" + documentId + "/assets/" + assetId);
    }

    @Test
    void openAdminAssetReturnsStoredObjectStreamWithTrustedMetadata() throws Exception {
        Long documentId = 100L;
        Long assetId = 800L;
        DocumentAssetPO asset = readyImageAsset(documentId, assetId);
        when(documentAssetMapper.selectById(assetId)).thenReturn(asset);
        when(objectStorage.get(asset.getStorageKey())).thenReturn(new ObjectStream(
                new ByteArrayInputStream("image-bytes".getBytes()),
                "application/octet-stream",
                11L));

        DocumentAssetServiceImpl service = new DocumentAssetServiceImpl(
                objectStorage,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentAssetAbility());

        DocumentAssetDownloadBO download = service.openAdminAsset(documentId, assetId);

        assertThat(download.getInputStream()).isNotNull();
        assertThat(download.getOriginalName()).isEqualTo("architecture.png");
        assertThat(download.getMimeType()).isEqualTo("image/png");
        assertThat(download.getSizeBytes()).isEqualTo(11L);
        assertThat(download.isInline()).isTrue();
    }

    @Test
    void openPublishedAssetRequiresPublishedReference() throws Exception {
        Long documentId = 100L;
        Long assetId = 800L;
        DocumentAssetPO asset = readyImageAsset(documentId, assetId);
        when(documentAssetMapper.selectById(assetId)).thenReturn(asset);
        when(documentAssetRefMapper.countByDocumentAssetScope(documentId, assetId, "PUBLISHED")).thenReturn(1);
        when(objectStorage.get(asset.getStorageKey())).thenReturn(new ObjectStream(
                new ByteArrayInputStream("image-bytes".getBytes()),
                "application/octet-stream",
                11L));

        DocumentAssetServiceImpl service = new DocumentAssetServiceImpl(
                objectStorage,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentAssetAbility());

        DocumentAssetDownloadBO download = service.openPublishedAsset(documentId, assetId);

        assertThat(download.getOriginalName()).isEqualTo("architecture.png");
        assertThat(download.getMimeType()).isEqualTo("image/png");
        assertThat(download.isInline()).isTrue();
    }

    private static DocumentAssetPO readyImageAsset(Long documentId, Long assetId) {
        DocumentAssetPO asset = new DocumentAssetPO();
        asset.setId(assetId);
        asset.setDocumentId(documentId);
        asset.setAssetKind("IMAGE");
        asset.setStatus("READY");
        asset.setStorageKey("documents/" + documentId + "/assets/" + assetId + "/object");
        asset.setOriginalName("architecture.png");
        asset.setFileExtension("png");
        asset.setMimeType("image/png");
        asset.setSizeBytes(11L);
        return asset;
    }
}
