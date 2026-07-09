import type { DocumentTreeNode } from '@/types/documentCenter';

interface DocumentTreePanelProps {
  nodes: DocumentTreeNode[];
  activeDocumentId?: string;
  activeNodeId?: string;
  onSelect?: (node: DocumentTreeNode) => void;
}

export function DocumentTreePanel({ nodes, activeDocumentId, activeNodeId, onSelect }: DocumentTreePanelProps) {
  if (!nodes.length) {
    return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">暂无文档节点</div>;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          activeDocumentId={activeDocumentId}
          activeNodeId={activeNodeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface TreeNodeItemProps {
  node: DocumentTreeNode;
  activeDocumentId?: string;
  activeNodeId?: string;
  onSelect?: (node: DocumentTreeNode) => void;
}

function TreeNodeItem({ node, activeDocumentId, activeNodeId, onSelect }: TreeNodeItemProps) {
  const active = node.id === activeDocumentId || node.id === activeNodeId;

  return (
    <div>
      <button
        type="button"
        className={[
          'w-full rounded-md px-3 py-2 text-left text-sm',
          node.nodeType === 'DIRECTORY' ? 'font-medium text-gray-700' : 'text-gray-600 hover:bg-brand-50',
          active ? 'bg-brand-50 text-brand-700' : '',
        ].join(' ')}
        onClick={() => onSelect?.(node)}
      >
        {node.title}
      </button>
      {!!node.children?.length && (
        <div className="ml-4 border-l border-gray-100 pl-2">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              activeDocumentId={activeDocumentId}
              activeNodeId={activeNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
