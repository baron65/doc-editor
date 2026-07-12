package com.xxx.pai.mlp.man.documentcenter.application;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentPublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentUnpublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentPublishAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentTreeMetaPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentTreeMetaMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DocumentPublishServiceImpl implements DocumentPublishService {

    private static final String NODE_TYPE_DOCUMENT = "DOCUMENT";
    private static final String REF_SCOPE_PUBLISHED = "PUBLISHED";
    private static final int ROOT_META_ID = 1;
    private static final long SYSTEM_USER_ID = 0L;

    private final DocumentNodeMapper documentNodeMapper;
    private final DocumentMapper documentMapper;
    private final DocumentTreeMetaMapper documentTreeMetaMapper;
    private final DocumentAssetRefMapper documentAssetRefMapper;
    private final DocumentPublishAbility documentPublishAbility;
    private final DocumentNameAbility documentNameAbility;

    public DocumentPublishServiceImpl(
            DocumentNodeMapper documentNodeMapper,
            DocumentMapper documentMapper,
            DocumentTreeMetaMapper documentTreeMetaMapper,
            DocumentAssetRefMapper documentAssetRefMapper,
            DocumentPublishAbility documentPublishAbility,
            DocumentNameAbility documentNameAbility) {
        this.documentNodeMapper = documentNodeMapper;
        this.documentMapper = documentMapper;
        this.documentTreeMetaMapper = documentTreeMetaMapper;
        this.documentAssetRefMapper = documentAssetRefMapper;
        this.documentPublishAbility = documentPublishAbility;
        this.documentNameAbility = documentNameAbility;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO publish(Long documentId, DocumentPublishDTO dto) {
        DocumentNodePO node = requireDocumentNode(documentId);
        DocumentPO document = requireDocument(documentId);
        assertDraftRevision(dto.getExpectedDraftRevision(), document.getDraftRevision());
        assertPublicationVersion(dto.getExpectedPublicationVersion(), document.getPublicationVersion());

        String publishedNameKey = documentNameAbility.normalizeNameKey(node.getDraftName());
        ensurePublishedNameUnique(node.getParentId(), publishedNameKey, documentId);

        LocalDateTime now = LocalDateTime.now();
        long nextPublicationVersion = document.getPublicationVersion() + 1;

        node.setPublishedName(node.getDraftName());
        node.setPublishedNameKey(publishedNameKey);
        node.setNodeVersion(node.getNodeVersion() + 1);
        node.setUpdatedBy(SYSTEM_USER_ID);
        node.setUpdatedAt(now);
        documentNodeMapper.updateById(node);

        int publishedRows = documentMapper.publishIfRevisionsMatch(
                documentId,
                dto.getExpectedDraftRevision(),
                document.getPublicationVersion(),
                SYSTEM_USER_ID,
                now);
        if (publishedRows != 1) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT, "publication revision conflict");
        }
        documentAssetRefMapper.deleteByDocumentIdAndRefScope(documentId, REF_SCOPE_PUBLISHED);
        documentAssetRefMapper.copyDraftRefsToPublished(documentId);

        long treeRevision = bumpTreeRevision();
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(documentId));
        operation.setDraftRevision(String.valueOf(document.getDraftRevision()));
        operation.setPublishedRevision(String.valueOf(document.getDraftRevision()));
        operation.setPublicationVersion(String.valueOf(nextPublicationVersion));
        operation.setTreeRevision(String.valueOf(treeRevision));
        operation.setPublishState("PUBLISHED");
        operation.setAlreadyUnpublished(false);
        return operation;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO unpublish(Long documentId, DocumentUnpublishDTO dto) {
        DocumentNodePO node = requireDocumentNode(documentId);
        DocumentPO document = requireDocument(documentId);
        if (!Integer.valueOf(1).equals(document.getIsPublished())) {
            DocumentOperationVO operation = DocumentOperationVO.empty();
            operation.setId(String.valueOf(documentId));
            operation.setDraftRevision(String.valueOf(document.getDraftRevision()));
            operation.setPublishedRevision(document.getPublishedRevision() == null
                    ? null
                    : String.valueOf(document.getPublishedRevision()));
            operation.setPublicationVersion(String.valueOf(document.getPublicationVersion()));
            operation.setPublishState("DRAFT");
            operation.setAlreadyUnpublished(true);
            return operation;
        }
        assertPublicationVersion(dto.getExpectedPublicationVersion(), document.getPublicationVersion());

        LocalDateTime now = LocalDateTime.now();
        long nextPublicationVersion = document.getPublicationVersion() + 1;

        node.setPublishedName(null);
        node.setPublishedNameKey(null);
        node.setNodeVersion(node.getNodeVersion() + 1);
        node.setUpdatedBy(SYSTEM_USER_ID);
        node.setUpdatedAt(now);
        documentNodeMapper.updateById(node);

        int unpublishedRows = documentMapper.unpublishIfPublicationVersionMatches(
                documentId,
                dto.getExpectedPublicationVersion());
        if (unpublishedRows != 1) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_PUBLICATION_CONFLICT, "publication version conflict");
        }
        documentAssetRefMapper.deleteByDocumentIdAndRefScope(documentId, REF_SCOPE_PUBLISHED);

        long treeRevision = bumpTreeRevision();
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(documentId));
        operation.setDraftRevision(String.valueOf(document.getDraftRevision()));
        operation.setPublishedRevision(null);
        operation.setPublicationVersion(String.valueOf(nextPublicationVersion));
        operation.setTreeRevision(String.valueOf(treeRevision));
        operation.setPublishState("DRAFT");
        operation.setAlreadyUnpublished(false);
        return operation;
    }

    private DocumentNodePO requireDocumentNode(Long documentId) {
        DocumentNodePO node = documentNodeMapper.selectById(documentId);
        if (node == null || !NODE_TYPE_DOCUMENT.equals(node.getNodeType())) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "document does not exist");
        }
        return node;
    }

    private DocumentPO requireDocument(Long documentId) {
        DocumentPO document = documentMapper.selectById(documentId);
        if (document == null) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "document content does not exist");
        }
        return document;
    }

    private void assertDraftRevision(Long expectedDraftRevision, Long currentDraftRevision) {
        if (!documentPublishAbility.canPublish(expectedDraftRevision, currentDraftRevision)) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT, "draft revision conflict");
        }
    }

    private void assertPublicationVersion(Long expectedPublicationVersion, Long currentPublicationVersion) {
        if (expectedPublicationVersion != null && !expectedPublicationVersion.equals(currentPublicationVersion)) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_PUBLICATION_CONFLICT, "publication version conflict");
        }
    }

    private void ensurePublishedNameUnique(Long parentId, String publishedNameKey, Long excludeNodeId) {
        if (!StringUtils.hasText(publishedNameKey)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_NODE_NAME, "published name must not be blank");
        }
        LambdaQueryWrapper<DocumentNodePO> queryWrapper = new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .eq(DocumentNodePO::getPublishedNameKey, publishedNameKey)
                .ne(DocumentNodePO::getId, excludeNodeId);
        if (documentNodeMapper.selectCount(queryWrapper) > 0) {
            throw new DocumentBusinessException(DocumentErrorCode.DUPLICATE_PUBLISHED_NAME, "duplicate published name under the same parent");
        }
    }

    private long bumpTreeRevision() {
        DocumentTreeMetaPO treeMeta = documentTreeMetaMapper.selectById(ROOT_META_ID);
        if (treeMeta == null) {
            treeMeta = new DocumentTreeMetaPO();
            treeMeta.setMetaId(ROOT_META_ID);
            treeMeta.setTreeRevision(0L);
            treeMeta.setUpdatedAt(LocalDateTime.now());
            documentTreeMetaMapper.insert(treeMeta);
        }
        long newRevision = treeMeta.getTreeRevision() + 1;
        int updatedRows = documentTreeMetaMapper.incrementRevisionIfMatches(
                ROOT_META_ID,
                treeMeta.getTreeRevision(),
                LocalDateTime.now());
        if (updatedRows != 1) {
            throw new DocumentBusinessException(DocumentErrorCode.TREE_VERSION_CONFLICT, "tree revision conflict");
        }
        return newRevision;
    }
}
