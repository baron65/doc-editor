package com.xxx.pai.mlp.man.documentcenter.application;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedAssetVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentSearchVO;
import com.xxx.pai.mlp.man.documentcenter.domain.ability.DocumentNameAbility;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentAssetRefMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PublishedDocumentQueryServiceImpl implements PublishedDocumentQueryService {

    private static final String NODE_TYPE_DOCUMENT = "DOCUMENT";
    private static final int MAX_SEARCH_LIMIT = 50;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter OFFSET_DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    private final DocumentNodeMapper documentNodeMapper;
    private final DocumentMapper documentMapper;
    private final DocumentAssetMapper documentAssetMapper;
    private final DocumentAssetRefMapper documentAssetRefMapper;
    private final DocumentJsonUtils documentJsonUtils;
    private final DocumentNameAbility documentNameAbility;

    public PublishedDocumentQueryServiceImpl(
            DocumentNodeMapper documentNodeMapper,
            DocumentMapper documentMapper,
            DocumentAssetMapper documentAssetMapper,
            DocumentAssetRefMapper documentAssetRefMapper,
            DocumentNameAbility documentNameAbility,
            DocumentJsonUtils documentJsonUtils) {
        this.documentNodeMapper = documentNodeMapper;
        this.documentMapper = documentMapper;
        this.documentAssetMapper = documentAssetMapper;
        this.documentAssetRefMapper = documentAssetRefMapper;
        this.documentNameAbility = documentNameAbility;
        this.documentJsonUtils = documentJsonUtils;
    }

    @Override
    public PublishedDocumentDetailVO getPublishedDocument(Long documentId) {
        DocumentNodePO node = requirePublishedNode(documentId);
        DocumentPO document = requirePublishedDocument(documentId);
        PublishedDocumentDetailVO detail = toPublishedDetail(node, document);
        detail.setAssets(loadPublishedAssets(documentId));
        return detail;
    }

    @Override
    public PublishedDocumentSearchVO searchByTitle(String keyword, Integer limit) {
        String normalizedKeyword = documentNameAbility.normalizeNameKey(keyword);
        if (normalizedKeyword.isEmpty() || normalizedKeyword.length() > 100) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "search keyword length must be 1 to 100");
        }
        int effectiveLimit = Math.max(1, Math.min(limit == null ? 20 : limit, MAX_SEARCH_LIMIT));
        List<DocumentNodePO> matchedNodes = documentNodeMapper.searchPublishedByNameKey(
                escapeLikePattern(normalizedKeyword), effectiveLimit);
        PublishedDocumentSearchVO response = new PublishedDocumentSearchVO();
        response.setKeyword(normalizedKeyword);
        if (matchedNodes.isEmpty()) {
            return response;
        }

        Map<Long, DocumentPO> publishedDocumentMap = documentMapper.selectBatchIds(
                        matchedNodes.stream().map(DocumentNodePO::getId).collect(Collectors.toList()))
                .stream()
                .filter(document -> Integer.valueOf(1).equals(document.getIsPublished()))
                .collect(Collectors.toMap(DocumentPO::getDocumentId, Function.identity()));

        Map<Long, DocumentNodePO> allNodes = documentNodeMapper.selectList(new LambdaQueryWrapper<DocumentNodePO>())
                .stream()
                .collect(Collectors.toMap(DocumentNodePO::getId, Function.identity()));
        List<PublishedDocumentSearchVO.SearchItemVO> results = new ArrayList<>();
        for (DocumentNodePO node : matchedNodes) {
            DocumentPO document = publishedDocumentMap.get(node.getId());
            if (document != null) {
                PublishedDocumentSearchVO.SearchItemVO item = new PublishedDocumentSearchVO.SearchItemVO();
                item.setDocumentId(String.valueOf(node.getId()));
                item.setTitle(node.getPublishedName());
                item.setBreadcrumb(buildBreadcrumb(node, allNodes));
                results.add(item);
            }
        }
        response.setItems(results);
        return response;
    }

    private DocumentNodePO requirePublishedNode(Long documentId) {
        DocumentNodePO node = documentNodeMapper.selectById(documentId);
        if (node == null || !NODE_TYPE_DOCUMENT.equals(node.getNodeType()) || !StringUtils.hasText(node.getPublishedName())) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "published document does not exist");
        }
        return node;
    }

    private DocumentPO requirePublishedDocument(Long documentId) {
        DocumentPO document = documentMapper.selectById(documentId);
        if (document == null || !Integer.valueOf(1).equals(document.getIsPublished())) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "published document does not exist");
        }
        return document;
    }

    private PublishedDocumentDetailVO toPublishedDetail(DocumentNodePO node, DocumentPO document) {
        PublishedDocumentDetailVO detail = new PublishedDocumentDetailVO();
        detail.setDocumentId(String.valueOf(document.getDocumentId()));
        detail.setTitle(node.getPublishedName());
        detail.setSchemaVersion(document.getPublishedSchemaVersion());
        detail.setContent(documentJsonUtils.fromJson(document.getPublishedContentJson()));
        detail.setPublishedRevision(String.valueOf(document.getPublishedRevision()));
        detail.setPublicationVersion(String.valueOf(document.getPublicationVersion()));
        if (document.getPublishedAt() != null) {
            detail.setPublishedAt(document.getPublishedAt()
                    .atZone(BUSINESS_ZONE)
                    .format(OFFSET_DATE_TIME_FORMATTER));
        }
        return detail;
    }

    private Map<String, PublishedAssetVO> loadPublishedAssets(Long documentId) {
        List<Long> assetIds = documentAssetRefMapper.selectAssetIdsByDocumentAndScope(documentId, "PUBLISHED");
        if (assetIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, DocumentAssetPO> assetsById = documentAssetMapper.selectBatchIds(assetIds).stream()
                .collect(Collectors.toMap(DocumentAssetPO::getId, Function.identity()));
        Map<String, PublishedAssetVO> assets = new LinkedHashMap<>();
        for (Long assetId : assetIds) {
            DocumentAssetPO asset = assetsById.get(assetId);
            if (asset == null) {
                continue;
            }
            PublishedAssetVO item = new PublishedAssetVO();
            item.setAssetId(String.valueOf(asset.getId()));
            item.setAssetKind(asset.getAssetKind());
            item.setFileName(asset.getOriginalName());
            item.setMimeType(asset.getMimeType());
            item.setSizeBytes(String.valueOf(asset.getSizeBytes()));
            assets.put(item.getAssetId(), item);
        }
        return assets;
    }

    private List<String> buildBreadcrumb(DocumentNodePO node, Map<Long, DocumentNodePO> allNodes) {
        List<String> breadcrumb = new ArrayList<>();
        Long parentId = node.getParentId();
        while (parentId != null && parentId > 0) {
            DocumentNodePO parent = allNodes.get(parentId);
            if (parent == null) {
                break;
            }
            breadcrumb.add(0, StringUtils.hasText(parent.getPublishedName())
                    ? parent.getPublishedName()
                    : parent.getDraftName());
            parentId = parent.getParentId();
        }
        return breadcrumb;
    }

    private String escapeLikePattern(String value) {
        return value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
