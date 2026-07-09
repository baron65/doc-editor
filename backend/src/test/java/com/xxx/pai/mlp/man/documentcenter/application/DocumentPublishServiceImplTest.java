package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentPublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentUnpublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentPublishAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentTreeMetaPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentTreeMetaMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DocumentPublishServiceImplTest {

    @Mock
    private DocumentNodeMapper documentNodeMapper;

    @Mock
    private DocumentMapper documentMapper;

    @Mock
    private DocumentTreeMetaMapper documentTreeMetaMapper;

    @Mock
    private DocumentAssetRefMapper documentAssetRefMapper;

    @Test
    void publishReplacesPublishedAssetReferencesFromDraftReferences() {
        Long documentId = 100L;
        DocumentNodePO node = draftNode(documentId);
        DocumentPO document = draftDocument(documentId);
        DocumentTreeMetaPO treeMeta = treeMeta(21L);

        when(documentNodeMapper.selectById(documentId)).thenReturn(node);
        when(documentMapper.selectById(documentId)).thenReturn(document);
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta);
        when(documentNodeMapper.updateById(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.updateById(any(DocumentPO.class))).thenReturn(1);
        when(documentTreeMetaMapper.updateById(any(DocumentTreeMetaPO.class))).thenReturn(1);
        when(documentAssetRefMapper.deleteByDocumentIdAndRefScope(documentId, "PUBLISHED")).thenReturn(0);
        when(documentAssetRefMapper.copyDraftRefsToPublished(documentId)).thenReturn(2);

        DocumentPublishServiceImpl service = new DocumentPublishServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentTreeMetaMapper,
                documentAssetRefMapper,
                new DocumentPublishAbility(),
                new DocumentNameAbility());
        DocumentPublishDTO dto = new DocumentPublishDTO();
        dto.setExpectedDraftRevision(5L);
        dto.setExpectedPublicationVersion(0L);

        DocumentOperationVO result = service.publish(documentId, dto);

        verify(documentAssetRefMapper).deleteByDocumentIdAndRefScope(documentId, "PUBLISHED");
        verify(documentAssetRefMapper).copyDraftRefsToPublished(documentId);
        assertThat(result.getPublishState()).isEqualTo("PUBLISHED");
        assertThat(result.getPublicationVersion()).isEqualTo("1");
    }

    @Test
    void unpublishClearsPublishedSnapshotAndBumpsPublicationVersion() {
        Long documentId = 100L;
        DocumentNodePO node = publishedNode(documentId);
        DocumentPO document = publishedDocument(documentId);
        DocumentTreeMetaPO treeMeta = treeMeta(21L);

        when(documentNodeMapper.selectById(documentId)).thenReturn(node);
        when(documentMapper.selectById(documentId)).thenReturn(document);
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta);
        when(documentNodeMapper.updateById(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.updateById(any(DocumentPO.class))).thenReturn(1);
        when(documentTreeMetaMapper.updateById(any(DocumentTreeMetaPO.class))).thenReturn(1);

        DocumentPublishServiceImpl service = new DocumentPublishServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentTreeMetaMapper,
                documentAssetRefMapper,
                new DocumentPublishAbility(),
                new DocumentNameAbility());
        DocumentUnpublishDTO dto = new DocumentUnpublishDTO();
        dto.setExpectedPublicationVersion(7L);

        DocumentOperationVO result = service.unpublish(documentId, dto);

        assertThat(node.getPublishedName()).isNull();
        assertThat(node.getPublishedNameKey()).isNull();
        assertThat(document.getIsPublished()).isZero();
        assertThat(document.getPublishedSchemaVersion()).isNull();
        assertThat(document.getPublishedContentJson()).isNull();
        assertThat(document.getPublishedRevision()).isNull();
        assertThat(document.getPublicationVersion()).isEqualTo(8L);
        assertThat(treeMeta.getTreeRevision()).isEqualTo(22L);
        assertThat(result.getPublicationVersion()).isEqualTo("8");
        assertThat(result.getPublishedRevision()).isNull();
        assertThat(result.getTreeRevision()).isEqualTo("22");
        assertThat(result.getPublishState()).isEqualTo("DRAFT");
        assertThat(result.getAlreadyUnpublished()).isFalse();
        verify(documentAssetRefMapper).deleteByDocumentIdAndRefScope(documentId, "PUBLISHED");
    }

    private static DocumentNodePO draftNode(Long documentId) {
        DocumentNodePO node = new DocumentNodePO();
        node.setId(documentId);
        node.setParentId(0L);
        node.setNodeType("DOCUMENT");
        node.setDraftName("发布指南");
        node.setDraftNameKey("发布指南");
        node.setPublishedName(null);
        node.setPublishedNameKey(null);
        node.setSortOrder(10);
        node.setNodeVersion(3L);
        return node;
    }

    private static DocumentPO draftDocument(Long documentId) {
        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setDraftSchemaVersion(1);
        document.setDraftContentJson("{\"type\":\"doc\"}");
        document.setDraftRevision(5L);
        document.setPublishedRevision(null);
        document.setPublicationVersion(0L);
        document.setIsPublished(0);
        return document;
    }

    private static DocumentNodePO publishedNode(Long documentId) {
        DocumentNodePO node = new DocumentNodePO();
        node.setId(documentId);
        node.setParentId(0L);
        node.setNodeType("DOCUMENT");
        node.setDraftName("发布指南");
        node.setDraftNameKey("发布指南");
        node.setPublishedName("发布指南");
        node.setPublishedNameKey("发布指南");
        node.setSortOrder(10);
        node.setNodeVersion(3L);
        return node;
    }

    private static DocumentPO publishedDocument(Long documentId) {
        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setDraftSchemaVersion(1);
        document.setDraftContentJson("{\"type\":\"doc\"}");
        document.setDraftRevision(5L);
        document.setPublishedSchemaVersion(1);
        document.setPublishedContentJson("{\"type\":\"doc\",\"published\":true}");
        document.setPublishedRevision(5L);
        document.setPublicationVersion(7L);
        document.setIsPublished(1);
        return document;
    }

    private static DocumentTreeMetaPO treeMeta(Long treeRevision) {
        DocumentTreeMetaPO treeMeta = new DocumentTreeMetaPO();
        treeMeta.setMetaId(1);
        treeMeta.setTreeRevision(treeRevision);
        return treeMeta;
    }
}
