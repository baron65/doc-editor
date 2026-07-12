package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentTreeAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentTreeMetaPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentTreeMetaMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentIdGenerator;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DocumentTreeServiceImplTest {

    @Mock
    private DocumentNodeMapper documentNodeMapper;

    @Mock
    private DocumentMapper documentMapper;

    @Mock
    private DocumentTreeMetaMapper documentTreeMetaMapper;

    @Mock
    private DocumentIdGenerator documentIdGenerator;

    @Test
    void adminTreeExposesDraftPublishedAndPendingUpdateStates() {
        DocumentNodePO draftNode = documentNode(101L, "草稿标题", null);
        DocumentNodePO publishedNode = documentNode(102L, "线上标题", "线上标题");
        DocumentNodePO changedNode = documentNode(103L, "更新后的标题", "旧线上标题");
        when(documentNodeMapper.selectList(any())).thenReturn(List.of(draftNode, publishedNode, changedNode));
        when(documentMapper.selectBatchIds(any())).thenReturn(List.of(
                document(101L, 2L, null, false),
                document(102L, 3L, 3L, true),
                document(103L, 5L, 4L, true)));
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta(8L));

        DocumentTreeVO result = service().getAdminTree();

        assertThat(result.getNodes()).extracting(DocumentTreeVO.TreeNodeVO::getPublishState)
                .containsExactly("DRAFT", "PUBLISHED", "PUBLISHED_WITH_CHANGES");
        assertThat(result.getNodes().get(2).getDraftTitle()).isEqualTo("更新后的标题");
        assertThat(result.getNodes().get(2).getPublishedTitle()).isEqualTo("旧线上标题");
        assertThat(result.getNodes().get(2).getNodeId()).isEqualTo("103");
    }

    @Test
    void publishedTreeExposesThePublishedRevision() {
        DocumentNodePO node = documentNode(101L, "草稿标题", "线上标题");
        when(documentNodeMapper.selectList(any())).thenReturn(List.of(node));
        when(documentMapper.selectList(any())).thenReturn(List.of(document(101L, 5L, 4L, true)));
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta(8L));

        DocumentTreeVO result = service().getPublishedTree();

        assertThat(result.getNodes()).hasSize(1);
        assertThat(result.getNodes().get(0).getPublishedRevision()).isEqualTo("4");
    }

    @Test
    void createDocumentAllowsFourthLevelDirectoryAsParent() {
        Long firstLevelId = 100L;
        Long secondLevelId = 200L;
        Long thirdLevelId = 300L;
        Long fourthLevelId = 400L;
        Long documentId = 900L;
        DocumentTreeMetaPO treeMeta = treeMeta(3L);

        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta);
        when(documentNodeMapper.selectById(firstLevelId)).thenReturn(directory(firstLevelId, 0L, "一级"));
        when(documentNodeMapper.selectById(secondLevelId)).thenReturn(directory(secondLevelId, firstLevelId, "二级"));
        when(documentNodeMapper.selectById(thirdLevelId)).thenReturn(directory(thirdLevelId, secondLevelId, "三级"));
        when(documentNodeMapper.selectById(fourthLevelId)).thenReturn(directory(fourthLevelId, thirdLevelId, "四级"));
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentNodeMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(documentNodeMapper.insert(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.insert(any(DocumentPO.class))).thenReturn(1);
        when(documentTreeMetaMapper.incrementRevisionIfMatches(any(), any(), any())).thenReturn(1);
        when(documentIdGenerator.nextId()).thenReturn(documentId);

        DocumentTreeServiceImpl service = new DocumentTreeServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentTreeMetaMapper,
                new DocumentTreeAbility(),
                new DocumentNameAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                documentIdGenerator);
        DocumentDTO dto = new DocumentDTO();
        dto.setParentId(fourthLevelId);
        dto.setTitle("部署说明");
        dto.setExpectedTreeRevision(3L);

        DocumentOperationVO result = service.createDocument(dto);

        assertThat(result.getId()).isEqualTo(String.valueOf(documentId));
        assertThat(result.getDraftRevision()).isEqualTo("1");
        assertThat(result.getTreeRevision()).isEqualTo("4");
    }

    @Test
    void createDocumentInsertsAtRequestedTargetIndex() {
        Long documentId = 900L;
        DocumentNodePO existing = documentNode(800L, "现有文档", null);
        existing.setSortOrder(10);
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta(3L));
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentNodeMapper.selectList(any())).thenReturn(List.of(existing));
        when(documentNodeMapper.insert(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.insert(any(DocumentPO.class))).thenReturn(1);
        when(documentTreeMetaMapper.incrementRevisionIfMatches(any(), any(), any())).thenReturn(1);
        when(documentIdGenerator.nextId()).thenReturn(documentId);

        DocumentDTO dto = new DocumentDTO();
        dto.setParentId(0L);
        dto.setTitle("插入首位");
        dto.setTargetIndex(0);
        dto.setExpectedTreeRevision(3L);

        service().createDocument(dto);

        assertThat(existing.getSortOrder()).isEqualTo(20);
        verify(documentNodeMapper).updateById(existing);
    }

    @Test
    void createDocumentRollsBackWhenTreeRevisionChangedDuringWrite() {
        Long parentId = 400L;
        Long documentId = 900L;
        when(documentTreeMetaMapper.selectById(1)).thenReturn(treeMeta(3L));
        when(documentNodeMapper.selectById(parentId)).thenReturn(directory(parentId, 0L, "目录"));
        when(documentNodeMapper.selectCount(any())).thenReturn(0L);
        when(documentNodeMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(documentNodeMapper.insert(any(DocumentNodePO.class))).thenReturn(1);
        when(documentMapper.insert(any(DocumentPO.class))).thenReturn(1);
        when(documentTreeMetaMapper.incrementRevisionIfMatches(any(), any(), any())).thenReturn(0);
        when(documentIdGenerator.nextId()).thenReturn(documentId);

        DocumentTreeServiceImpl service = new DocumentTreeServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentTreeMetaMapper,
                new DocumentTreeAbility(),
                new DocumentNameAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                documentIdGenerator);
        DocumentDTO dto = new DocumentDTO();
        dto.setParentId(parentId);
        dto.setTitle("并发文档");
        dto.setExpectedTreeRevision(3L);

        assertThatThrownBy(() -> service.createDocument(dto))
                .isInstanceOf(DocumentBusinessException.class)
                .isInstanceOfSatisfying(DocumentBusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(DocumentErrorCode.TREE_VERSION_CONFLICT))
                .hasMessageContaining("tree revision conflict");
    }

    private static DocumentNodePO directory(Long id, Long parentId, String name) {
        DocumentNodePO node = new DocumentNodePO();
        node.setId(id);
        node.setParentId(parentId);
        node.setNodeType("DIRECTORY");
        node.setDraftName(name);
        node.setDraftNameKey(name);
        node.setPublishedName(name);
        node.setPublishedNameKey(name);
        node.setSortOrder(10);
        node.setNodeVersion(1L);
        return node;
    }

    private static DocumentNodePO documentNode(Long id, String draftTitle, String publishedTitle) {
        DocumentNodePO node = new DocumentNodePO();
        node.setId(id);
        node.setParentId(0L);
        node.setNodeType("DOCUMENT");
        node.setDraftName(draftTitle);
        node.setDraftNameKey(draftTitle);
        node.setPublishedName(publishedTitle);
        node.setPublishedNameKey(publishedTitle);
        node.setSortOrder(id.intValue());
        node.setNodeVersion(1L);
        return node;
    }

    private static DocumentPO document(Long id, Long draftRevision, Long publishedRevision, boolean published) {
        DocumentPO document = new DocumentPO();
        document.setDocumentId(id);
        document.setDraftRevision(draftRevision);
        document.setPublishedRevision(publishedRevision);
        document.setIsPublished(published ? 1 : 0);
        return document;
    }

    private DocumentTreeServiceImpl service() {
        return new DocumentTreeServiceImpl(
                documentNodeMapper,
                documentMapper,
                documentTreeMetaMapper,
                new DocumentTreeAbility(),
                new DocumentNameAbility(),
                new DocumentJsonUtils(new ObjectMapper()),
                documentIdGenerator);
    }

    private static DocumentTreeMetaPO treeMeta(Long treeRevision) {
        DocumentTreeMetaPO treeMeta = new DocumentTreeMetaPO();
        treeMeta.setMetaId(1);
        treeMeta.setTreeRevision(treeRevision);
        return treeMeta;
    }
}
