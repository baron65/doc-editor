import { useState } from 'react';
import type { DocumentTreeNode } from '../../types/documentCenter';
import { DocumentTreePanel } from './DocumentTreePanel';

interface ResponsiveDocumentTreeProps {
  nodes: DocumentTreeNode[];
  activeDocumentId?: string;
  onSelect: (node: DocumentTreeNode) => void;
}

export function ResponsiveDocumentTree({ nodes, activeDocumentId, onSelect }: ResponsiveDocumentTreeProps) {
  const [open, setOpen] = useState(false);
  const selectAndClose = (node: DocumentTreeNode) => {
    onSelect(node);
    if (node.nodeType === 'DOCUMENT') {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-5 left-5 z-30 rounded-full bg-brand-500 px-4 py-3 text-sm text-white shadow-lg lg:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        打开文档目录
      </button>
      <aside data-desktop-document-tree="true" className="hidden w-72 shrink-0 lg:block">
        <h1 className="mb-4 text-xl font-semibold text-gray-950">文档中心</h1>
        <DocumentTreePanel
          nodes={nodes}
          activeDocumentId={activeDocumentId}
          searchable
          onSelect={onSelect}
        />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="文档目录">
          <button
            aria-label="关闭文档目录"
            className="absolute inset-0 bg-gray-950/30"
            type="button"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-[min(86vw,20rem)] overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-950">文档中心</h1>
              <button className="rounded-md border border-gray-200 px-3 py-1.5 text-sm" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
            <DocumentTreePanel
              nodes={nodes}
              activeDocumentId={activeDocumentId}
              searchable
              onSelect={selectAndClose}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
