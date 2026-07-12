import { useEffect, useMemo, useState } from 'react';
import type { DocumentTreeNode } from '../../types/documentCenter';
import { collectAncestorDirectoryIds, filterTreeByTitle } from './treeModel';

interface DocumentTreePanelProps {
  nodes: DocumentTreeNode[];
  activeDocumentId?: string;
  activeNodeId?: string;
  searchable?: boolean;
  onSelect?: (node: DocumentTreeNode) => void;
}

export function DocumentTreePanel({
  nodes,
  activeDocumentId,
  activeNodeId,
  searchable = false,
  onSelect,
}: DocumentTreePanelProps) {
  const [keyword, setKeyword] = useState('');
  const [collapsedDirectoryIds, setCollapsedDirectoryIds] = useState<Set<string>>(new Set());
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
          onToggleDirectory={toggleDirectory}
          onSelect={onSelect}
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
  onToggleDirectory: (directoryId: string) => void;
  onSelect?: (node: DocumentTreeNode) => void;
}

function TreeNodeItem({
  node,
  activeDocumentId,
  activeNodeId,
  collapsedDirectoryIds,
  forceExpanded,
  onToggleDirectory,
  onSelect,
}: TreeNodeItemProps) {
  const active = node.id === activeDocumentId || node.id === activeNodeId;
  const isDirectory = node.nodeType === 'DIRECTORY';
  const collapsed = isDirectory && !forceExpanded && collapsedDirectoryIds.has(node.id);

  return (
    <div>
      <div className="flex items-center">
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
          <span className="block truncate">{node.title}</span>
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
              onToggleDirectory={onToggleDirectory}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
