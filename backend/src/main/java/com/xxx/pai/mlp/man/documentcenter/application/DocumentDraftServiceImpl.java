package com.xxx.pai.mlp.man.documentcenter.application;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDraftDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.AdminDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentContentAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.ContentValidationResultBO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetRefPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentContentAssetExtractor;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DocumentDraftServiceImpl implements DocumentDraftService {

    private static final String NODE_TYPE_DOCUMENT = "DOCUMENT";
    private static final String ASSET_STATUS_READY = "READY";
    private static final String REF_SCOPE_DRAFT = "DRAFT";
    private static final long SYSTEM_USER_ID = 0L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter OFFSET_DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    private final DocumentNodeMapper documentNodeMapper;
    private final DocumentMapper documentMapper;
    private final DocumentAssetMapper documentAssetMapper;
    private final DocumentAssetRefMapper documentAssetRefMapper;
    private final DocumentNameAbility documentNameAbility;
    private final DocumentContentAbility documentContentAbility;
    private final DocumentJsonUtils documentJsonUtils;
    private final DocumentContentAssetExtractor documentContentAssetExtractor;

    public DocumentDraftServiceImpl(
            DocumentNodeMapper documentNodeMapper,
            DocumentMapper documentMapper,
            DocumentAssetMapper documentAssetMapper,
            DocumentAssetRefMapper documentAssetRefMapper,
            DocumentNameAbility documentNameAbility,
            DocumentContentAbility documentContentAbility,
            DocumentJsonUtils documentJsonUtils,
            DocumentContentAssetExtractor documentContentAssetExtractor) {
        this.documentNodeMapper = documentNodeMapper;
        this.documentMapper = documentMapper;
        this.documentAssetMapper = documentAssetMapper;
        this.documentAssetRefMapper = documentAssetRefMapper;
        this.documentNameAbility = documentNameAbility;
        this.documentContentAbility = documentContentAbility;
        this.documentJsonUtils = documentJsonUtils;
        this.documentContentAssetExtractor = documentContentAssetExtractor;
    }

    @Override
    public AdminDocumentDetailVO getDraft(Long documentId) {
        DocumentNodePO node = requireDocumentNode(documentId);
        DocumentPO document = requireDocument(documentId);

        AdminDocumentDetailVO detail = new AdminDocumentDetailVO();
        detail.setDocumentId(String.valueOf(documentId));
        detail.setParentId(String.valueOf(node.getParentId()));
        detail.setTitle(node.getDraftName());
        detail.setDraftTitle(node.getDraftName());
        detail.setPublishedTitle(node.getPublishedName());
        detail.setSchemaVersion(document.getDraftSchemaVersion());
        detail.setContent(documentJsonUtils.fromJson(document.getDraftContentJson()));
        detail.setDraftRevision(String.valueOf(document.getDraftRevision()));
        detail.setPublishedRevision(document.getPublishedRevision() == null
                ? null
                : String.valueOf(document.getPublishedRevision()));
        detail.setPublicationVersion(String.valueOf(document.getPublicationVersion()));
        boolean published = Integer.valueOf(1).equals(document.getIsPublished());
        detail.setPublished(published);
        detail.setPublishState(resolvePublishState(node, document));
        detail.setDraftUpdatedAt(formatDateTime(document.getDraftUpdatedAt()));
        detail.setPublishedAt(formatDateTime(document.getPublishedAt()));
        return detail;
    }

    private String resolvePublishState(DocumentNodePO node, DocumentPO document) {
        if (!Integer.valueOf(1).equals(document.getIsPublished())) {
            return "DRAFT";
        }
        boolean sameRevision = Objects.equals(document.getDraftRevision(), document.getPublishedRevision());
        boolean sameTitle = Objects.equals(node.getDraftName(), node.getPublishedName());
        return sameRevision && sameTitle ? "PUBLISHED" : "PUBLISHED_WITH_CHANGES";
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.atZone(BUSINESS_ZONE).format(OFFSET_DATE_TIME_FORMATTER);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO saveDraft(Long documentId, DocumentDraftDTO dto) {
        DocumentNodePO node = requireDocumentNode(documentId);
        DocumentPO document = requireDocument(documentId);
        if (!dto.getExpectedDraftRevision().equals(document.getDraftRevision())) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT, "draft revision conflict");
        }

        String normalizedTitle = normalizeRequiredTitle(dto.getTitle());
        ensureDraftNameUnique(node.getParentId(), normalizedTitle, documentId);
        String contentJson = serializeContent(dto);
        ContentValidationResultBO validationResult =
                documentContentAbility.validateDraftContent(dto.getSchemaVersion(), contentJson);
        if (!validationResult.isValid()) {
            throw new DocumentBusinessException(
                    validationResult.isTooLarge()
                            ? DocumentErrorCode.CONTENT_TOO_LARGE
                            : DocumentErrorCode.CONTENT_SCHEMA_INVALID,
                    validationResult.getReason());
        }
        Set<Long> draftAssetIds = documentContentAssetExtractor.extractAssetIds(dto.getContent());
        ensureDraftAssetsReady(documentId, draftAssetIds);

        LocalDateTime now = LocalDateTime.now();
        node.setDraftName(dto.getTitle().trim());
        node.setDraftNameKey(normalizedTitle);
        node.setNodeVersion(node.getNodeVersion() + 1);
        node.setUpdatedBy(SYSTEM_USER_ID);
        node.setUpdatedAt(now);
        documentNodeMapper.updateById(node);

        long nextDraftRevision = document.getDraftRevision() + 1;
        int updatedRows = documentMapper.updateDraftIfRevisionMatches(
                documentId,
                dto.getExpectedDraftRevision(),
                dto.getSchemaVersion(),
                contentJson,
                SYSTEM_USER_ID,
                now);
        if (updatedRows != 1) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT, "draft revision conflict");
        }
        replaceDraftAssetRefs(documentId, draftAssetIds, now);

        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(documentId));
        operation.setDraftRevision(String.valueOf(nextDraftRevision));
        operation.setPublishedRevision(document.getPublishedRevision() == null
                ? null
                : String.valueOf(document.getPublishedRevision()));
        operation.setPublicationVersion(String.valueOf(document.getPublicationVersion()));
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

    private String normalizeRequiredTitle(String title) {
        String normalizedTitle = documentNameAbility.normalizeNameKey(title);
        if (!StringUtils.hasText(normalizedTitle)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_NODE_NAME, "title must not be blank");
        }
        return normalizedTitle;
    }

    private void ensureDraftNameUnique(Long parentId, String draftNameKey, Long excludeNodeId) {
        LambdaQueryWrapper<DocumentNodePO> queryWrapper = new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .eq(DocumentNodePO::getDraftNameKey, draftNameKey)
                .ne(DocumentNodePO::getId, excludeNodeId);
        if (documentNodeMapper.selectCount(queryWrapper) > 0) {
            throw new DocumentBusinessException(DocumentErrorCode.DUPLICATE_DRAFT_NAME, "duplicate draft name under the same parent");
        }
    }

    private String serializeContent(DocumentDraftDTO dto) {
        try {
            return documentJsonUtils.toJson(dto.getContent());
        } catch (JsonProcessingException exception) {
            throw new DocumentBusinessException(DocumentErrorCode.CONTENT_SCHEMA_INVALID, "draft content is not valid json");
        }
    }

    private void ensureDraftAssetsReady(Long documentId, Set<Long> draftAssetIds) {
        if (draftAssetIds.isEmpty()) {
            return;
        }
        long readyAssetCount = documentAssetMapper.selectCount(new LambdaQueryWrapper<DocumentAssetPO>()
                .eq(DocumentAssetPO::getDocumentId, documentId)
                .eq(DocumentAssetPO::getStatus, ASSET_STATUS_READY)
                .in(DocumentAssetPO::getId, draftAssetIds));
        if (readyAssetCount != draftAssetIds.size()) {
            throw new DocumentBusinessException(DocumentErrorCode.ASSET_NOT_READY, "draft references assets that are not ready");
        }
    }

    private void replaceDraftAssetRefs(Long documentId, Set<Long> draftAssetIds, LocalDateTime now) {
        documentAssetRefMapper.deleteByDocumentIdAndRefScope(documentId, REF_SCOPE_DRAFT);
        if (draftAssetIds.isEmpty()) {
            return;
        }
        List<DocumentAssetRefPO> refs = draftAssetIds.stream()
                .map(assetId -> {
                    DocumentAssetRefPO ref = new DocumentAssetRefPO();
                    ref.setDocumentId(documentId);
                    ref.setAssetId(assetId);
                    ref.setRefScope(REF_SCOPE_DRAFT);
                    ref.setCreatedAt(now);
                    return ref;
                })
                .collect(Collectors.toList());
        documentAssetRefMapper.insertBatch(refs);
    }
}
