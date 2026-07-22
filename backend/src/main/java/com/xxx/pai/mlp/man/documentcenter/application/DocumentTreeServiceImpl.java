package com.xxx.pai.mlp.man.documentcenter.application;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryRenameDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.NodePositionDTO;
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
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentBusinessException;
import com.xxx.pai.mlp.man.documentcenter.infra.exception.DocumentErrorCode;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DocumentTreeServiceImpl implements DocumentTreeService {

    private static final String NODE_TYPE_DIRECTORY = "DIRECTORY";
    private static final String NODE_TYPE_DOCUMENT = "DOCUMENT";
    private static final int ROOT_PARENT_ID = 0;
    private static final int ROOT_META_ID = 1;
    private static final long SYSTEM_USER_ID = 0L;
    private static final int DEFAULT_SCHEMA_VERSION = 1;

    private final DocumentNodeMapper documentNodeMapper;
    private final DocumentMapper documentMapper;
    private final DocumentTreeMetaMapper documentTreeMetaMapper;
    private final DocumentTreeAbility documentTreeAbility;
    private final DocumentNameAbility documentNameAbility;
    private final DocumentJsonUtils documentJsonUtils;

    public DocumentTreeServiceImpl(
            DocumentNodeMapper documentNodeMapper,
            DocumentMapper documentMapper,
            DocumentTreeMetaMapper documentTreeMetaMapper,
            DocumentTreeAbility documentTreeAbility,
            DocumentNameAbility documentNameAbility,
            DocumentJsonUtils documentJsonUtils) {
        this.documentNodeMapper = documentNodeMapper;
        this.documentMapper = documentMapper;
        this.documentTreeMetaMapper = documentTreeMetaMapper;
        this.documentTreeAbility = documentTreeAbility;
        this.documentNameAbility = documentNameAbility;
        this.documentJsonUtils = documentJsonUtils;
    }

    @Override
    public DocumentTreeVO getAdminTree() {
        List<DocumentNodePO> nodes = listAllNodes();
        Map<Long, DocumentPO> documentMap = listDocumentsByIds(extractDocumentIds(nodes));
        DocumentTreeVO tree = new DocumentTreeVO();
        tree.setTreeRevision(String.valueOf(getOrCreateTreeMeta().getTreeRevision()));
        tree.setNodes(buildTree(nodes, documentMap, false));
        tree.setDefaultDocumentId(findFirstDocumentId(tree.getNodes()));
        return tree;
    }

    @Override
    public DocumentTreeVO getPublishedTree() {
        List<DocumentNodePO> nodes = listAllNodes();
        Map<Long, DocumentPO> publishedDocuments = listPublishedDocuments();
        DocumentTreeVO tree = new DocumentTreeVO();
        tree.setTreeRevision(String.valueOf(getOrCreateTreeMeta().getTreeRevision()));
        if (publishedDocuments.isEmpty()) {
            tree.setNodes(Collections.emptyList());
            return tree;
        }

        Set<Long> includedNodeIds = collectPublishedTreeNodeIds(nodes, publishedDocuments.keySet());
        List<DocumentNodePO> filteredNodes = nodes.stream()
                .filter(node -> includedNodeIds.contains(node.getId()))
                .collect(Collectors.toList());
        tree.setNodes(buildTree(filteredNodes, publishedDocuments, true));
        tree.setDefaultDocumentId(findFirstDocumentId(tree.getNodes()));
        return tree;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO createDirectory(DirectoryDTO dto) {
        String normalizedName = normalizeRequiredName(dto.getName());
        DocumentTreeMetaPO treeMeta = getOrCreateTreeMeta();
        assertTreeRevision(dto.getExpectedTreeRevision(), treeMeta.getTreeRevision());
        DocumentNodePO parentNode = requireParentDirectory(dto.getParentId());
        assertNewDirectoryDepthAllowed(parentNode);
        ensureDraftNameUnique(dto.getParentId(), normalizedName, null);
        ensurePublishedNameUnique(dto.getParentId(), normalizedName, null);

        LocalDateTime now = LocalDateTime.now();
        DocumentNodePO node = new DocumentNodePO();
        node.setParentId(dto.getParentId());
        node.setNodeType(NODE_TYPE_DIRECTORY);
        node.setDraftName(dto.getName().trim());
        node.setDraftNameKey(normalizedName);
        node.setPublishedName(dto.getName().trim());
        node.setPublishedNameKey(normalizedName);
        node.setSortOrder(nextSortOrder(dto.getParentId()));
        node.setNodeVersion(1L);
        node.setCreatorId(SYSTEM_USER_ID);
        node.setCreateTime(now);
        node.setUpdatorId(SYSTEM_USER_ID);
        node.setUpdateTime(now);
        documentNodeMapper.insert(node);
        long nodeId = requireGeneratedId(node.getId());
        reorderNewNode(node, dto.getTargetIndex(), now);

        long newTreeRevision = bumpTreeRevision(treeMeta);
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(nodeId));
        operation.setNodeId(String.valueOf(nodeId));
        operation.setTreeRevision(String.valueOf(newTreeRevision));
        return operation;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO createDocument(DocumentDTO dto) {
        String normalizedTitle = normalizeRequiredName(dto.getTitle());
        DocumentTreeMetaPO treeMeta = getOrCreateTreeMeta();
        assertTreeRevision(dto.getExpectedTreeRevision(), treeMeta.getTreeRevision());
        DocumentNodePO parentNode = requireParentDirectory(dto.getParentId());
        assertDocumentParentDepthAllowed(parentNode);
        ensureDraftNameUnique(dto.getParentId(), normalizedTitle, null);

        LocalDateTime now = LocalDateTime.now();

        DocumentNodePO node = new DocumentNodePO();
        node.setParentId(dto.getParentId());
        node.setNodeType(NODE_TYPE_DOCUMENT);
        node.setDraftName(dto.getTitle().trim());
        node.setDraftNameKey(normalizedTitle);
        node.setPublishedName(null);
        node.setPublishedNameKey(null);
        node.setSortOrder(nextSortOrder(dto.getParentId()));
        node.setNodeVersion(1L);
        node.setCreatorId(SYSTEM_USER_ID);
        node.setCreateTime(now);
        node.setUpdatorId(SYSTEM_USER_ID);
        node.setUpdateTime(now);
        documentNodeMapper.insert(node);
        long documentId = requireGeneratedId(node.getId());
        reorderNewNode(node, dto.getTargetIndex(), now);

        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setDraftSchemaVersion(DEFAULT_SCHEMA_VERSION);
        document.setDraftContentJson(serializeEmptyContent());
        document.setDraftRevision(1L);
        document.setPublishedSchemaVersion(null);
        document.setPublishedContentJson(null);
        document.setPublishedRevision(null);
        document.setPublicationVersion(0L);
        document.setIsPublished(0);
        document.setDraftUpdatedBy(SYSTEM_USER_ID);
        document.setDraftUpdatedAt(now);
        document.setPublishedBy(null);
        document.setPublishedAt(null);
        documentMapper.insert(document);

        long newTreeRevision = bumpTreeRevision(treeMeta);
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(documentId));
        operation.setDocumentId(String.valueOf(documentId));
        operation.setDraftRevision(String.valueOf(document.getDraftRevision()));
        operation.setTreeRevision(String.valueOf(newTreeRevision));
        return operation;
    }

    private long requireGeneratedId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalStateException("database did not return generated document node id");
        }
        return id;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO renameDirectory(Long directoryId, DirectoryRenameDTO dto) {
        String normalizedName = normalizeRequiredName(dto.getName());
        DocumentTreeMetaPO treeMeta = getOrCreateTreeMeta();
        assertTreeRevision(dto.getExpectedTreeRevision(), treeMeta.getTreeRevision());
        DocumentNodePO node = requireDirectoryNode(directoryId);
        ensureDraftNameUnique(node.getParentId(), normalizedName, directoryId);
        ensurePublishedNameUnique(node.getParentId(), normalizedName, directoryId);

        LocalDateTime now = LocalDateTime.now();
        node.setDraftName(dto.getName().trim());
        node.setDraftNameKey(normalizedName);
        node.setPublishedName(dto.getName().trim());
        node.setPublishedNameKey(normalizedName);
        node.setNodeVersion(node.getNodeVersion() + 1);
        node.setUpdatorId(SYSTEM_USER_ID);
        node.setUpdateTime(now);
        documentNodeMapper.updateById(node);

        long newTreeRevision = bumpTreeRevision(treeMeta);
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(directoryId));
        operation.setParentId(String.valueOf(node.getParentId()));
        operation.setSortOrder(node.getSortOrder());
        operation.setTreeRevision(String.valueOf(newTreeRevision));
        operation.setPublishedNavigationChanged(true);
        return operation;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO moveNode(Long nodeId, NodePositionDTO dto) {
        DocumentTreeMetaPO treeMeta = getOrCreateTreeMeta();
        assertTreeRevision(dto.getExpectedTreeRevision(), treeMeta.getTreeRevision());
        DocumentNodePO node = requireNode(nodeId);
        DocumentNodePO targetParentNode = requireParentDirectory(dto.getTargetParentId());
        validateMoveTarget(node, targetParentNode, dto.getTargetParentId());
        ensureDraftNameUnique(dto.getTargetParentId(), node.getDraftNameKey(), nodeId);
        if (StringUtils.hasText(node.getPublishedNameKey())) {
            ensurePublishedNameUnique(dto.getTargetParentId(), node.getPublishedNameKey(), nodeId);
        }

        boolean sameParent = node.getParentId().equals(dto.getTargetParentId());
        LocalDateTime now = LocalDateTime.now();
        if (sameParent) {
            List<DocumentNodePO> siblings = listSiblings(node.getParentId());
            siblings.removeIf(sibling -> sibling.getId().equals(nodeId));
            insertAtTargetIndex(siblings, node, dto.getTargetIndex());
            normalizeSiblingSortOrders(siblings, node.getParentId(), now);
        } else {
            List<DocumentNodePO> sourceSiblings = listSiblings(node.getParentId());
            sourceSiblings.removeIf(sibling -> sibling.getId().equals(nodeId));
            normalizeSiblingSortOrders(sourceSiblings, node.getParentId(), now);

            List<DocumentNodePO> targetSiblings = listSiblings(dto.getTargetParentId());
            targetSiblings.removeIf(sibling -> sibling.getId().equals(nodeId));
            node.setParentId(dto.getTargetParentId());
            insertAtTargetIndex(targetSiblings, node, dto.getTargetIndex());
            normalizeSiblingSortOrders(targetSiblings, dto.getTargetParentId(), now);
        }

        long newTreeRevision = bumpTreeRevision(treeMeta);
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(nodeId));
        operation.setParentId(String.valueOf(node.getParentId()));
        operation.setSortOrder(node.getSortOrder());
        operation.setTreeRevision(String.valueOf(newTreeRevision));
        operation.setPublishedNavigationChanged(isPublishedNavigationAffected(node));
        return operation;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentOperationVO deleteNode(Long nodeId, Long expectedTreeRevision) {
        DocumentTreeMetaPO treeMeta = getOrCreateTreeMeta();
        assertTreeRevision(expectedTreeRevision, treeMeta.getTreeRevision());
        DocumentNodePO node = requireNode(nodeId);
        boolean publishedNavigationChanged = isPublishedNavigationAffected(node);
        if (NODE_TYPE_DIRECTORY.equals(node.getNodeType())) {
            long childCount = documentNodeMapper.selectCount(new LambdaQueryWrapper<DocumentNodePO>()
                    .eq(DocumentNodePO::getParentId, nodeId));
            if (childCount > 0) {
                throw new DocumentBusinessException(DocumentErrorCode.DIRECTORY_NOT_EMPTY, "directory is not empty");
            }
            int deletedRows = documentNodeMapper.softDeleteById(nodeId, SYSTEM_USER_ID, LocalDateTime.now());
            assertSoftDeleted(deletedRows);
        } else if (NODE_TYPE_DOCUMENT.equals(node.getNodeType())) {
            DocumentPO document = documentMapper.selectById(nodeId);
            if (document != null && Integer.valueOf(1).equals(document.getIsPublished())) {
                throw new DocumentBusinessException(DocumentErrorCode.PUBLISHED_DOCUMENT_CANNOT_DELETE, "published document cannot be deleted");
            }
            LocalDateTime deleteTime = LocalDateTime.now();
            int deletedDocumentRows = documentMapper.softDeleteById(nodeId, SYSTEM_USER_ID, deleteTime);
            int deletedNodeRows = documentNodeMapper.softDeleteById(nodeId, SYSTEM_USER_ID, deleteTime);
            assertSoftDeleted(deletedDocumentRows);
            assertSoftDeleted(deletedNodeRows);
        } else {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "unsupported node type");
        }

        long newTreeRevision = bumpTreeRevision(treeMeta);
        DocumentOperationVO operation = DocumentOperationVO.empty();
        operation.setId(String.valueOf(nodeId));
        operation.setTreeRevision(String.valueOf(newTreeRevision));
        operation.setPublishedNavigationChanged(publishedNavigationChanged);
        return operation;
    }

    private void assertSoftDeleted(int deletedRows) {
        if (deletedRows != 1) {
            throw new DocumentBusinessException(
                    DocumentErrorCode.DOCUMENT_NOT_FOUND,
                    "node was already deleted");
        }
    }

    private List<DocumentNodePO> listAllNodes() {
        return documentNodeMapper.selectList(new LambdaQueryWrapper<DocumentNodePO>()
                .orderByAsc(DocumentNodePO::getSortOrder)
                .orderByAsc(DocumentNodePO::getId));
    }

    private Map<Long, DocumentPO> listDocumentsByIds(Collection<Long> documentIds) {
        if (documentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return documentMapper.selectBatchIds(documentIds).stream()
                .collect(Collectors.toMap(DocumentPO::getDocumentId, document -> document));
    }

    private Map<Long, DocumentPO> listPublishedDocuments() {
        return documentMapper.selectList(new LambdaQueryWrapper<DocumentPO>()
                        .eq(DocumentPO::getIsPublished, 1))
                .stream()
                .collect(Collectors.toMap(DocumentPO::getDocumentId, document -> document));
    }

    private Set<Long> extractDocumentIds(List<DocumentNodePO> nodes) {
        return nodes.stream()
                .filter(node -> NODE_TYPE_DOCUMENT.equals(node.getNodeType()))
                .map(DocumentNodePO::getId)
                .collect(Collectors.toSet());
    }

    private Set<Long> collectPublishedTreeNodeIds(List<DocumentNodePO> nodes, Set<Long> publishedDocumentIds) {
        Map<Long, DocumentNodePO> nodeMap = nodes.stream()
                .collect(Collectors.toMap(DocumentNodePO::getId, node -> node));
        Set<Long> includedNodeIds = new HashSet<>();
        for (Long documentId : publishedDocumentIds) {
            Long currentId = documentId;
            while (currentId != null && currentId > ROOT_PARENT_ID) {
                includedNodeIds.add(currentId);
                DocumentNodePO currentNode = nodeMap.get(currentId);
                if (currentNode == null) {
                    break;
                }
                currentId = currentNode.getParentId();
            }
        }
        return includedNodeIds;
    }

    private List<DocumentTreeVO.TreeNodeVO> buildTree(
            List<DocumentNodePO> nodes, Map<Long, DocumentPO> documentMap, boolean publishedOnly) {
        Map<Long, DocumentTreeVO.TreeNodeVO> nodeVoMap = new LinkedHashMap<>();
        for (DocumentNodePO node : nodes) {
            DocumentTreeVO.TreeNodeVO treeNode = new DocumentTreeVO.TreeNodeVO();
            treeNode.setId(String.valueOf(node.getId()));
            treeNode.setNodeId(String.valueOf(node.getId()));
            treeNode.setParentId(String.valueOf(node.getParentId()));
            treeNode.setNodeType(node.getNodeType());
            treeNode.setSortOrder(node.getSortOrder());

            if (NODE_TYPE_DIRECTORY.equals(node.getNodeType())) {
                String directoryName = resolveDirectoryTitle(node, publishedOnly);
                treeNode.setTitle(directoryName);
                treeNode.setName(directoryName);
                treeNode.setPublished(true);
            } else {
                DocumentPO document = documentMap.get(node.getId());
                if (publishedOnly && document == null) {
                    continue;
                }
                String visibleTitle = resolveDocumentTitle(node, publishedOnly);
                boolean published = document != null && Integer.valueOf(1).equals(document.getIsPublished());
                treeNode.setTitle(visibleTitle);
                treeNode.setDraftTitle(node.getDraftName());
                treeNode.setPublishedTitle(node.getPublishedName());
                treeNode.setPublished(published);
                treeNode.setPublishState(resolvePublishState(node, document));
                treeNode.setPublishedRevision(document == null || document.getPublishedRevision() == null
                        ? null
                        : String.valueOf(document.getPublishedRevision()));
            }
            nodeVoMap.put(node.getId(), treeNode);
        }

        List<DocumentTreeVO.TreeNodeVO> roots = new ArrayList<>();
        for (DocumentNodePO node : nodes) {
            DocumentTreeVO.TreeNodeVO treeNode = nodeVoMap.get(node.getId());
            if (treeNode == null) {
                continue;
            }
            if (node.getParentId() == ROOT_PARENT_ID) {
                roots.add(treeNode);
                continue;
            }
            DocumentTreeVO.TreeNodeVO parent = nodeVoMap.get(node.getParentId());
            if (parent != null) {
                parent.getChildren().add(treeNode);
            }
        }
        sortTree(roots);
        return roots;
    }

    private void sortTree(List<DocumentTreeVO.TreeNodeVO> nodes) {
        nodes.sort(Comparator.comparing(DocumentTreeVO.TreeNodeVO::getSortOrder)
                .thenComparing(DocumentTreeVO.TreeNodeVO::getId));
        for (DocumentTreeVO.TreeNodeVO node : nodes) {
            sortTree(node.getChildren());
        }
    }

    private String resolveDirectoryTitle(DocumentNodePO node, boolean publishedOnly) {
        if (publishedOnly && StringUtils.hasText(node.getPublishedName())) {
            return node.getPublishedName();
        }
        return node.getDraftName();
    }

    private String resolveDocumentTitle(DocumentNodePO node, boolean publishedOnly) {
        if (publishedOnly && StringUtils.hasText(node.getPublishedName())) {
            return node.getPublishedName();
        }
        return node.getDraftName();
    }

    private String resolvePublishState(DocumentNodePO node, DocumentPO document) {
        if (document == null || !Integer.valueOf(1).equals(document.getIsPublished())) {
            return "DRAFT";
        }
        boolean sameRevision = Objects.equals(document.getDraftRevision(), document.getPublishedRevision());
        boolean sameTitle = Objects.equals(node.getDraftName(), node.getPublishedName());
        return sameRevision && sameTitle ? "PUBLISHED" : "PUBLISHED_WITH_CHANGES";
    }

    private String findFirstDocumentId(List<DocumentTreeVO.TreeNodeVO> nodes) {
        for (DocumentTreeVO.TreeNodeVO node : nodes) {
            if (NODE_TYPE_DOCUMENT.equals(node.getNodeType())) {
                return node.getId();
            }
            String childDocumentId = findFirstDocumentId(node.getChildren());
            if (childDocumentId != null) {
                return childDocumentId;
            }
        }
        return null;
    }

    private DocumentNodePO requireParentDirectory(Long parentId) {
        if (parentId == null || parentId == ROOT_PARENT_ID) {
            return null;
        }
        DocumentNodePO parentNode = documentNodeMapper.selectById(parentId);
        if (parentNode == null) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "parent directory does not exist");
        }
        if (!NODE_TYPE_DIRECTORY.equals(parentNode.getNodeType())) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_MOVE_TARGET, "parent node must be a directory");
        }
        return parentNode;
    }

    private DocumentNodePO requireDirectoryNode(Long directoryId) {
        DocumentNodePO node = requireNode(directoryId);
        if (!NODE_TYPE_DIRECTORY.equals(node.getNodeType())) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "node must be a directory");
        }
        return node;
    }

    private DocumentNodePO requireNode(Long nodeId) {
        DocumentNodePO node = documentNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new DocumentBusinessException(DocumentErrorCode.DOCUMENT_NOT_FOUND, "node does not exist");
        }
        return node;
    }

    private void assertNewDirectoryDepthAllowed(DocumentNodePO parentNode) {
        int newDirectoryDepth = parentNode == null ? 1 : calculateDepth(parentNode.getId()) + 1;
        if (!documentTreeAbility.isValidDepth(newDirectoryDepth)) {
            throw new DocumentBusinessException(DocumentErrorCode.DIRECTORY_DEPTH_EXCEEDED, "directory depth exceeds maximum");
        }
    }

    private void assertDocumentParentDepthAllowed(DocumentNodePO parentNode) {
        int parentDirectoryDepth = parentNode == null ? 0 : calculateDepth(parentNode.getId());
        if (!documentTreeAbility.isValidDepth(parentDirectoryDepth)) {
            throw new DocumentBusinessException(DocumentErrorCode.DIRECTORY_DEPTH_EXCEEDED, "document parent depth exceeds maximum");
        }
    }

    private void validateMoveTarget(DocumentNodePO node, DocumentNodePO targetParentNode, Long targetParentId) {
        if (NODE_TYPE_DIRECTORY.equals(node.getNodeType()) && isSelfOrDescendant(node.getId(), targetParentId)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_MOVE_TARGET, "directory cannot move to itself or descendant");
        }
        if (NODE_TYPE_DIRECTORY.equals(node.getNodeType())) {
            int targetParentDepth = targetParentNode == null ? 0 : calculateDepth(targetParentNode.getId());
            int movedSubtreeMaxDepth = targetParentDepth + calculateDirectorySubtreeRelativeDepth(node.getId());
            if (!documentTreeAbility.isValidDepth(movedSubtreeMaxDepth)) {
                throw new DocumentBusinessException(DocumentErrorCode.DIRECTORY_DEPTH_EXCEEDED, "directory depth exceeds maximum");
            }
            return;
        }
        if (NODE_TYPE_DOCUMENT.equals(node.getNodeType())) {
            assertDocumentParentDepthAllowed(targetParentNode);
            return;
        }
        throw new DocumentBusinessException(DocumentErrorCode.INVALID_REQUEST, "unsupported node type");
    }

    private boolean isSelfOrDescendant(Long sourceNodeId, Long candidateParentId) {
        Long currentId = candidateParentId;
        while (currentId != null && currentId > ROOT_PARENT_ID) {
            if (currentId.equals(sourceNodeId)) {
                return true;
            }
            DocumentNodePO currentNode = documentNodeMapper.selectById(currentId);
            if (currentNode == null) {
                return false;
            }
            currentId = currentNode.getParentId();
        }
        return false;
    }

    private int calculateDirectorySubtreeRelativeDepth(Long sourceDirectoryId) {
        List<DocumentNodePO> nodes = listAllNodes();
        Map<Long, List<DocumentNodePO>> childrenByParentId = nodes.stream()
                .collect(Collectors.groupingBy(DocumentNodePO::getParentId));
        return calculateDirectorySubtreeRelativeDepth(sourceDirectoryId, childrenByParentId, 1);
    }

    private int calculateDirectorySubtreeRelativeDepth(
            Long currentDirectoryId,
            Map<Long, List<DocumentNodePO>> childrenByParentId,
            int currentDepth) {
        int maxDepth = currentDepth;
        for (DocumentNodePO child : childrenByParentId.getOrDefault(currentDirectoryId, Collections.emptyList())) {
            if (NODE_TYPE_DIRECTORY.equals(child.getNodeType())) {
                maxDepth = Math.max(maxDepth,
                        calculateDirectorySubtreeRelativeDepth(child.getId(), childrenByParentId, currentDepth + 1));
            }
        }
        return maxDepth;
    }

    private int calculateDepth(Long nodeId) {
        int depth = 0;
        Long currentId = nodeId;
        while (currentId != null && currentId > ROOT_PARENT_ID) {
            DocumentNodePO currentNode = documentNodeMapper.selectById(currentId);
            if (currentNode == null) {
                break;
            }
            depth++;
            currentId = currentNode.getParentId();
        }
        return depth;
    }

    private List<DocumentNodePO> listSiblings(Long parentId) {
        return new ArrayList<>(documentNodeMapper.selectList(new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .orderByAsc(DocumentNodePO::getSortOrder)
                .orderByAsc(DocumentNodePO::getId)));
    }

    private void insertAtTargetIndex(List<DocumentNodePO> siblings, DocumentNodePO node, Integer targetIndex) {
        int index = Math.max(0, Math.min(targetIndex == null ? siblings.size() : targetIndex, siblings.size()));
        siblings.add(index, node);
    }

    private void reorderNewNode(DocumentNodePO node, Integer targetIndex, LocalDateTime now) {
        if (targetIndex == null) {
            return;
        }
        List<DocumentNodePO> siblings = listSiblings(node.getParentId());
        siblings.removeIf(sibling -> sibling.getId().equals(node.getId()));
        insertAtTargetIndex(siblings, node, targetIndex);
        normalizeSiblingSortOrders(siblings, node.getParentId(), now);
    }

    private void normalizeSiblingSortOrders(List<DocumentNodePO> siblings, Long parentId, LocalDateTime now) {
        for (int index = 0; index < siblings.size(); index++) {
            DocumentNodePO sibling = siblings.get(index);
            sibling.setParentId(parentId);
            sibling.setSortOrder((index + 1) * 10);
            sibling.setNodeVersion(sibling.getNodeVersion() + 1);
            sibling.setUpdatorId(SYSTEM_USER_ID);
            sibling.setUpdateTime(now);
            documentNodeMapper.updateById(sibling);
        }
    }

    private boolean isPublishedNavigationAffected(DocumentNodePO node) {
        if (NODE_TYPE_DIRECTORY.equals(node.getNodeType())) {
            return true;
        }
        if (!NODE_TYPE_DOCUMENT.equals(node.getNodeType())) {
            return false;
        }
        DocumentPO document = documentMapper.selectById(node.getId());
        return document != null && Integer.valueOf(1).equals(document.getIsPublished());
    }

    private String normalizeRequiredName(String name) {
        String normalized = documentNameAbility.normalizeNameKey(name);
        if (!StringUtils.hasText(normalized)) {
            throw new DocumentBusinessException(DocumentErrorCode.INVALID_NODE_NAME, "name must not be blank");
        }
        return normalized;
    }

    private void ensureDraftNameUnique(Long parentId, String draftNameKey, Long excludeNodeId) {
        LambdaQueryWrapper<DocumentNodePO> queryWrapper = new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .eq(DocumentNodePO::getDraftNameKey, draftNameKey);
        if (excludeNodeId != null) {
            queryWrapper.ne(DocumentNodePO::getId, excludeNodeId);
        }
        if (documentNodeMapper.selectCount(queryWrapper) > 0) {
            throw new DocumentBusinessException(DocumentErrorCode.DUPLICATE_DRAFT_NAME, "duplicate draft name under the same parent");
        }
    }

    private void ensurePublishedNameUnique(Long parentId, String publishedNameKey, Long excludeNodeId) {
        LambdaQueryWrapper<DocumentNodePO> queryWrapper = new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .eq(DocumentNodePO::getPublishedNameKey, publishedNameKey);
        if (excludeNodeId != null) {
            queryWrapper.ne(DocumentNodePO::getId, excludeNodeId);
        }
        if (documentNodeMapper.selectCount(queryWrapper) > 0) {
            throw new DocumentBusinessException(DocumentErrorCode.DUPLICATE_PUBLISHED_NAME, "duplicate published name under the same parent");
        }
    }

    private int nextSortOrder(Long parentId) {
        List<DocumentNodePO> siblingNodes = documentNodeMapper.selectList(new LambdaQueryWrapper<DocumentNodePO>()
                .eq(DocumentNodePO::getParentId, parentId)
                .orderByDesc(DocumentNodePO::getSortOrder)
                .last("limit 1"));
        if (siblingNodes.isEmpty()) {
            return 10;
        }
        return siblingNodes.get(0).getSortOrder() + 10;
    }

    private DocumentTreeMetaPO getOrCreateTreeMeta() {
        DocumentTreeMetaPO treeMeta = documentTreeMetaMapper.selectById(ROOT_META_ID);
        if (treeMeta != null) {
            return treeMeta;
        }
        DocumentTreeMetaPO initialMeta = new DocumentTreeMetaPO();
        initialMeta.setMetaId(ROOT_META_ID);
        initialMeta.setTreeRevision(0L);
        initialMeta.setUpdateTime(LocalDateTime.now());
        documentTreeMetaMapper.insert(initialMeta);
        return initialMeta;
    }

    private void assertTreeRevision(Long expectedTreeRevision, Long currentTreeRevision) {
        if (expectedTreeRevision != null && !expectedTreeRevision.equals(currentTreeRevision)) {
            throw new DocumentBusinessException(DocumentErrorCode.TREE_VERSION_CONFLICT, "tree revision conflict");
        }
    }

    private long bumpTreeRevision(DocumentTreeMetaPO treeMeta) {
        long newRevision = treeMeta.getTreeRevision() + 1;
        int updatedRows = documentTreeMetaMapper.incrementRevisionIfMatches(
                treeMeta.getMetaId(),
                treeMeta.getTreeRevision(),
                LocalDateTime.now());
        if (updatedRows != 1) {
            throw new DocumentBusinessException(DocumentErrorCode.TREE_VERSION_CONFLICT, "tree revision conflict");
        }
        return newRevision;
    }

    private String serializeEmptyContent() {
        try {
            return documentJsonUtils.toJson(documentJsonUtils.emptyDocumentContent());
        } catch (Exception exception) {
            throw new IllegalStateException("failed to serialize default document content", exception);
        }
    }
}
