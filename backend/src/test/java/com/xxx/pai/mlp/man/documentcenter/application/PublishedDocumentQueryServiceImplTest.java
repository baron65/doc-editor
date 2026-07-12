package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentSearchVO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class PublishedDocumentQueryServiceImplTest {

    @Mock
    private DocumentNodeMapper documentNodeMapper;

    @Mock
    private DocumentMapper documentMapper;

    @Mock
    private DocumentAssetMapper documentAssetMapper;

    @Mock
    private DocumentAssetRefMapper documentAssetRefMapper;

    @Test
    void publishedDetailContainsLastPublishedTimeWithOffset() {
        Long documentId = 100L;
        DocumentNodePO node = new DocumentNodePO();
        node.setId(documentId);
        node.setNodeType("DOCUMENT");
        node.setPublishedName("发布指南");
        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setIsPublished(1);
        document.setPublishedSchemaVersion(1);
        document.setPublishedContentJson("{\"type\":\"doc\",\"content\":[]}");
        document.setPublishedRevision(5L);
        document.setPublicationVersion(2L);
        document.setPublishedAt(LocalDateTime.of(2026, 7, 12, 9, 30));
        when(documentNodeMapper.selectById(documentId)).thenReturn(node);
        when(documentMapper.selectById(documentId)).thenReturn(document);
        when(documentAssetRefMapper.selectAssetIdsByDocumentAndScope(documentId, "PUBLISHED"))
                .thenReturn(List.of(501L));
        DocumentAssetPO asset = new DocumentAssetPO();
        asset.setId(501L);
        asset.setAssetKind("IMAGE");
        asset.setOriginalName("architecture.png");
        asset.setMimeType("image/png");
        asset.setSizeBytes(236812L);
        when(documentAssetMapper.selectBatchIds(List.of(501L))).thenReturn(List.of(asset));

        PublishedDocumentQueryServiceImpl service = new PublishedDocumentQueryServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentAssetMapper,
                documentAssetRefMapper,
                new com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility(),
                new DocumentJsonUtils(new ObjectMapper()));

        PublishedDocumentDetailVO result = service.getPublishedDocument(documentId);

        assertThat(result.getPublishedAt()).isEqualTo("2026-07-12T09:30:00+08:00");
        assertThat(result.getAssets()).containsOnlyKeys("501");
        assertThat(result.getAssets().get("501").getFileName()).isEqualTo("architecture.png");
    }

    @Test
    void searchNormalizesAndEscapesKeywordAndBuildsBreadcrumb() {
        DocumentNodePO directory = new DocumentNodePO();
        directory.setId(10L);
        directory.setParentId(0L);
        directory.setNodeType("DIRECTORY");
        directory.setPublishedName("推理服务");
        DocumentNodePO matched = new DocumentNodePO();
        matched.setId(100L);
        matched.setParentId(10L);
        matched.setNodeType("DOCUMENT");
        matched.setPublishedName("AI%_Guide");
        matched.setPublishedNameKey("ai%_guide");
        DocumentPO published = new DocumentPO();
        published.setDocumentId(100L);
        published.setIsPublished(1);
        when(documentNodeMapper.searchPublishedByNameKey("ai\\%\\_guide", 20)).thenReturn(List.of(matched));
        when(documentNodeMapper.selectList(any())).thenReturn(List.of(directory, matched));
        when(documentMapper.selectBatchIds(List.of(100L))).thenReturn(List.of(published));

        PublishedDocumentSearchVO result = service().searchByTitle("  ＡI%_Guide ", 20);

        assertThat(result.getKeyword()).isEqualTo("ai%_guide");
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getDocumentId()).isEqualTo("100");
        assertThat(result.getItems().get(0).getBreadcrumb()).containsExactly("推理服务");
    }

    private PublishedDocumentQueryServiceImpl service() {
        return new PublishedDocumentQueryServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentAssetMapper,
                documentAssetRefMapper,
                new com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility(),
                new DocumentJsonUtils(new ObjectMapper()));
    }
}
