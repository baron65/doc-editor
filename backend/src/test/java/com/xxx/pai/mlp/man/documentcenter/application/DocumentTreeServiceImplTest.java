package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
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

    private static DocumentTreeMetaPO treeMeta(Long treeRevision) {
        DocumentTreeMetaPO treeMeta = new DocumentTreeMetaPO();
        treeMeta.setMetaId(1);
        treeMeta.setTreeRevision(treeRevision);
        return treeMeta;
    }
}
