import { useEffect, useMemo, useState, type DragEvent } from 'react';
import type { DocumentTreeNode } from '../../types/documentCenter';
import { collectAncestorDirectoryIds, filterTreeByTitle } from './treeModel';
import { getPublishStatePresentation } from './treePublishState';
import { flattenTreeNodes, getDropDestination } from './treeManagementModel';

interface DocumentTreePanelProps {
  nodes: DocumentTreeNode[];
  activeDocumentId?: string;
  activeNodeId?: string;
  searchable?: boolean;
  showPublishState?: boolean;
  onSelect?: (node: DocumentTreeNode) => void;
  onMoveNode?: (
    node: DocumentTreeNode,
    destination: { targetParentId: string; targetIndex: number },
  ) => void;
}

export function DocumentTreePanel({
  nodes,
  activeDocumentId,
  activeNodeId,
  searchable = false,
  showPublishState = false,
  onSelect,
  onMoveNode,
}: DocumentTreePanelProps) {
  const [keyword, setKeyword] = useState('');
  const [collapsedDirectoryIds, setCollapsedDirectoryIds] = useState<Set<string>>(new Set());
  const [draggedNodeId, setDraggedNodeId] = useState<string>();
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string>();
  const filteredNodes = useMemo(() => filterTreeByTitle(nodes, keyword), [keyword, nodes]);
  const activeAncestors = useMemo(
    () => collectAncestorDirectoryIds(nodes, activeDocumentId ?? activeNodeId),
    [activeDocumentId, activeNodeId, nodes],
  );

  useEffect(() => {
    if (activeAncestors.size === 0) {
      return;
    }
    setCollapsedDirectoryIds((current) => {
      const next = new Set(current);
      activeAncestors.forEach((id) => next.delete(id));
      return next;
    });
  }, [activeAncestors]);

  const toggleDirectory = (directoryId: string) => {
    setCollapsedDirectoryIds((current) => {
      const next = new Set(current);
      if (next.has(directoryId)) {
        next.delete(directoryId);
      } else {
        next.add(directoryId);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragEvent, node: DocumentTreeNode) => {
    if (!onMoveNode) {
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.id);
    setDraggedNodeId(node.id);
  };

  const handleDrop = (event: DragEvent, targetNode: DocumentTreeNode) => {
    event.preventDefault();
    const movingNodeId = draggedNodeId ?? event.dataTransfer.getData('text/plain');
    const movingNode = flattenTreeNodes(nodes).find((node) => node.id === movingNodeId);
    const destination = getDropDestination(nodes, movingNode, targetNode);
    setDraggedNodeId(undefined);
    setDropTargetNodeId(undefined);
    if (movingNode && destination) {
      onMoveNode?.(movingNode, destination);
    }
  };

  if (!nodes.length) {
    return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">暂无文档节点</div>;
  }

  return (
    <div>
      {searchable ? (
        <input
          aria-label="搜索文档标题"
          className="mb-3 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
          placeholder="搜索文档标题"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      ) : null}
      {filteredNodes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">未找到匹配文档</div>
      ) : null}
      <div className="space-y-1">
      {filteredNodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          activeDocumentId={activeDocumentId}
          activeNodeId={activeNodeId}
          collapsedDirectoryIds={collapsedDirectoryIds}
          forceExpanded={Boolean(keyword.trim())}
          showPublishState={showPublishState}
          onToggleDirectory={toggleDirectory}
          onSelect={onSelect}
          draggable={Boolean(onMoveNode)}
          draggedNodeId={draggedNodeId}
          dropTargetNodeId={dropTargetNodeId}
          onDragStart={handleDragStart}
          onDragOver={(event, node) => {
            if (!draggedNodeId || draggedNodeId === node.id) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetNodeId(node.id);
          }}
          onDragEnd={() => {
            setDraggedNodeId(undefined);
            setDropTargetNodeId(undefined);
          }}
          onDrop={handleDrop}
        />
      ))}
      </div>
    </div>
  );
}

interface TreeNodeItemProps {
  node: DocumentTreeNode;
  activeDocumentId?: string;
  activeNodeId?: string;
  collapsedDirectoryIds: Set<string>;
  forceExpanded: boolean;
  showPublishState: boolean;
  onToggleDirectory: (directoryId: string) => void;
  onSelect?: (node: DocumentTreeNode) => void;
  draggable: boolean;
  draggedNodeId?: string;
  dropTargetNodeId?: string;
  onDragStart: (event: DragEvent, node: DocumentTreeNode) => void;
  onDragOver: (event: DragEvent, node: DocumentTreeNode) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent, node: DocumentTreeNode) => void;
}

function TreeNodeItem({
  node,
  activeDocumentId,
  activeNodeId,
  collapsedDirectoryIds,
  forceExpanded,
  showPublishState,
  onToggleDirectory,
  onSelect,
  draggable,
  draggedNodeId,
  dropTargetNodeId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: TreeNodeItemProps) {
  const active = node.id === activeDocumentId || node.id === activeNodeId;
  const isDirectory = node.nodeType === 'DIRECTORY';
  const collapsed = isDirectory && !forceExpanded && collapsedDirectoryIds.has(node.id);
  const statePresentation = !isDirectory && showPublishState && node.publishState
    ? getPublishStatePresentation(node.publishState)
    : undefined;

  return (
    <div>
      <div
        className={`flex items-center rounded-md ${
          draggedNodeId === node.id ? 'opacity-40' : ''
        } ${dropTargetNodeId === node.id ? 'ring-2 ring-brand-200' : ''}`}
        draggable={draggable}
        title={draggable ? '拖拽可排序或移动到目录' : undefined}
        onDragStart={(event) => onDragStart(event, node)}
        onDragOver={(event) => onDragOver(event, node)}
        onDragEnd={onDragEnd}
        onDrop={(event) => onDrop(event, node)}
      >
        {isDirectory ? (
          <button
            aria-label={`${collapsed ? '展开' : '折叠'}目录 ${node.title}`}
            className="w-7 shrink-0 rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            type="button"
            onClick={() => onToggleDirectory(node.id)}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        ) : <span className="w-7 shrink-0" />}
        <button
          type="button"
          className={[
            'min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm',
            isDirectory ? 'font-medium text-gray-700 hover:bg-gray-50' : 'text-gray-600 hover:bg-brand-50',
            active ? 'bg-brand-50 text-brand-700' : '',
          ].join(' ')}
          onClick={() => onSelect?.(node)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate">{node.draftTitle ?? node.title}</span>
            {statePresentation ? (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${statePresentation.className}`}>
                {statePresentation.label}
              </span>
            ) : null}
          </span>
        </button>
      </div>
      {!!node.children?.length && !collapsed && (
        <div className="ml-4 border-l border-gray-100 pl-2">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              activeDocumentId={activeDocumentId}
              activeNodeId={activeNodeId}
              collapsedDirectoryIds={collapsedDirectoryIds}
              forceExpanded={forceExpanded}
              showPublishState={showPublishState}
              onToggleDirectory={onToggleDirectory}
              onSelect={onSelect}
              draggable={draggable}
              draggedNodeId={draggedNodeId}
              dropTargetNodeId={dropTargetNodeId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
