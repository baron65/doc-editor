package com.xxx.pai.mlp.man.documentcenter.application;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
    private final DocumentJsonUtils documentJsonUtils;

    public PublishedDocumentQueryServiceImpl(
            DocumentNodeMapper documentNodeMapper,
            DocumentMapper documentMapper,
            DocumentJsonUtils documentJsonUtils) {
        this.documentNodeMapper = documentNodeMapper;
        this.documentMapper = documentMapper;
        this.documentJsonUtils = documentJsonUtils;
    }

    @Override
    public PublishedDocumentDetailVO getPublishedDocument(Long documentId) {
        DocumentNodePO node = requirePublishedNode(documentId);
        DocumentPO document = requirePublishedDocument(documentId);
        return toPublishedDetail(node, document);
    }

    @Override
    public List<PublishedDocumentDetailVO> searchByTitle(String keyword, Integer limit) {
        if (!StringUtils.hasText(keyword)) {
            return Collections.emptyList();
        }
        int effectiveLimit = Math.max(1, Math.min(limit == null ? 20 : limit, MAX_SEARCH_LIMIT));
        List<DocumentNodePO> matchedNodes = documentNodeMapper.selectList(new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getNodeType, NODE_TYPE_DOCUMENT)
                .like(DocumentNodePO::getPublishedName, keyword.trim())
                .orderByAsc(DocumentNodePO::getSortOrder)
                .orderByAsc(DocumentNodePO::getId)
                .last("limit " + effectiveLimit));
        if (matchedNodes.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, DocumentPO> publishedDocumentMap = documentMapper.selectBatchIds(
                        matchedNodes.stream().map(DocumentNodePO::getId).collect(Collectors.toList()))
                .stream()
                .filter(document -> Integer.valueOf(1).equals(document.getIsPublished()))
                .collect(Collectors.toMap(DocumentPO::getDocumentId, Function.identity()));

        List<PublishedDocumentDetailVO> results = new ArrayList<>();
        for (DocumentNodePO node : matchedNodes) {
            DocumentPO document = publishedDocumentMap.get(node.getId());
            if (document != null) {
                results.add(toPublishedDetail(node, document));
            }
        }
        return results;
    }

    private DocumentNodePO requirePublishedNode(Long documentId) {
        DocumentNodePO node = documentNodeMapper.selectById(documentId);
        if (node == null || !NODE_TYPE_DOCUMENT.equals(node.getNodeType()) || !StringUtils.hasText(node.getPublishedName())) {
            throw new DocumentBusinessException(DocumentErrorCode.NOT_FOUND, "published document does not exist");
        }
        return node;
    }

    private DocumentPO requirePublishedDocument(Long documentId) {
        DocumentPO document = documentMapper.selectById(documentId);
        if (document == null || !Integer.valueOf(1).equals(document.getIsPublished())) {
            throw new DocumentBusinessException(DocumentErrorCode.NOT_FOUND, "published document does not exist");
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
}
