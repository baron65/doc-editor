package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDraftDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.AdminDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentContentAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetRefPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentContentAssetExtractor;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DocumentDraftServiceImplTest {

    @Mock
    private DocumentNodeMapper documentNodeMapper;

    @Mock
    private DocumentMapper documentMapper;

    @Mock
    private DocumentAssetMapper documentAssetMapper;

    @Mock
    private DocumentAssetRefMapper documentAssetRefMapper;

    @Test
    void getDraftExposesSnapshotTitlesStateParentAndTimestamps() {
        Long documentId = 100L;
        DocumentNodePO node = documentNode(documentId);
        node.setParentId(88L);
        node.setDraftName("更新后的标题");
        node.setPublishedName("旧线上标题");
        DocumentPO document = document(documentId);
        document.setIsPublished(1);
        document.setPublishedRevision(2L);
        document.setPublicationVersion(4L);
        document.setDraftUpdatedAt(LocalDateTime.of(2026, 7, 12, 10, 30));
        document.setPublishedAt(LocalDateTime.of(2026, 7, 11, 9, 15));
        when(documentNodeMapper.selectById(documentId)).thenReturn(node);
        when(documentMapper.selectById(documentId)).thenReturn(document);

        AdminDocumentDetailVO result = service().getDraft(documentId);

        assertThat(result.getParentId()).isEqualTo("88");
        assertThat(result.getDraftTitle()).isEqualTo("更新后的标题");
        assertThat(result.getPublishedTitle()).isEqualTo("旧线上标题");
        assertThat(result.getPublishState()).isEqualTo("PUBLISHED_WITH_CHANGES");
        assertThat(result.getDraftUpdatedAt()).isEqualTo("2026-07-12T10:30:00+08:00");
        assertThat(result.getPublishedAt()).isEqualTo("2026-07-11T09:15:00+08:00");
    }

    @Test
    void saveDraftReplacesDraftAssetReferencesFromContent() {
        Long documentId = 100L;
        when(documentNodeMapper.selectById(documentId)).thenReturn(documentNode(documentId));
        when(documentMapper.selectById(documentId)).thenReturn(document(documentId));
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentAssetMapper.selectCount(any())).thenReturn(2L);
        when(documentNodeMapper.updateById(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.updateDraftIfRevisionMatches(
                any(), any(), any(), any(), any(), any())).thenReturn(1);
        when(documentAssetRefMapper.softDeleteByDocumentIdAndRefScope(
                any(), any(), any(), any())).thenReturn(0);
        when(documentAssetRefMapper.insertBatch(any())).thenReturn(2);

        DocumentDraftServiceImpl service = new DocumentDraftServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentNameAbility(),
                new DocumentContentAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                new DocumentContentAssetExtractor());
        DocumentDraftDTO dto = new DocumentDraftDTO();
        dto.setTitle("图文说明");
        dto.setSchemaVersion(1);
        dto.setExpectedDraftRevision(3L);
        dto.setContent(Map.of(
                "type", "doc",
                "content", List.of(
                        Map.of("type", "image", "attrs", Map.of("assetId", "501")),
                        Map.of("type", "attachment", "attrs", Map.of("assetId", 502L)))));

        DocumentOperationVO operation = service.saveDraft(documentId, dto);

        ArgumentCaptor<List<DocumentAssetRefPO>> refsCaptor = ArgumentCaptor.forClass(List.class);
        verify(documentAssetRefMapper).softDeleteByDocumentIdAndRefScope(
                any(), any(), any(), any());
        verify(documentAssetRefMapper).insertBatch(refsCaptor.capture());
        assertThat(refsCaptor.getValue())
                .extracting(DocumentAssetRefPO::getAssetId)
                .containsExactly(501L, 502L);
        assertThat(refsCaptor.getValue())
                .allSatisfy(ref -> {
                    assertThat(ref.getDocumentId()).isEqualTo(documentId);
                    assertThat(ref.getRefScope()).isEqualTo("DRAFT");
                    assertThat(ref.getCreateTime()).isNotNull();
                });
        assertThat(operation.getDraftRevision()).isEqualTo("4");
    }

    @Test
    void saveDraftRejectsConcurrentDatabaseUpdate() {
        Long documentId = 100L;
        when(documentNodeMapper.selectById(documentId)).thenReturn(documentNode(documentId));
        when(documentMapper.selectById(documentId)).thenReturn(document(documentId));
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentNodeMapper.updateById(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.updateDraftIfRevisionMatches(
                any(), any(), any(), any(), any(), any())).thenReturn(0);

        DocumentDraftServiceImpl service = new DocumentDraftServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentNameAbility(),
                new DocumentContentAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                new DocumentContentAssetExtractor());
        DocumentDraftDTO dto = new DocumentDraftDTO();
        dto.setTitle("并发草稿");
        dto.setSchemaVersion(1);
        dto.setExpectedDraftRevision(3L);
        dto.setContent(Map.of("type", "doc", "content", List.of()));

        assertThatThrownBy(() -> service.saveDraft(documentId, dto))
                .isInstanceOf(DocumentBusinessException.class)
                .isInstanceOfSatisfying(DocumentBusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT))
                .hasMessageContaining("draft revision conflict");
    }

    private static DocumentNodePO documentNode(Long documentId) {
        DocumentNodePO node = new DocumentNodePO();
        node.setId(documentId);
        node.setParentId(0L);
        node.setNodeType("DOCUMENT");
        node.setDraftName("图文说明");
        node.setDraftNameKey("图文说明");
        node.setSortOrder(10);
        node.setNodeVersion(1L);
        return node;
    }

    private static DocumentPO document(Long documentId) {
        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setDraftSchemaVersion(1);
        document.setDraftContentJson("{\"type\":\"doc\"}");
        document.setDraftRevision(3L);
        document.setPublicationVersion(0L);
        document.setIsPublished(0);
        return document;
    }

    private DocumentDraftServiceImpl service() {
        return new DocumentDraftServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentAssetMapper,
                documentAssetRefMapper,
                new DocumentNameAbility(),
                new DocumentContentAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                new DocumentContentAssetExtractor());
    }
}
