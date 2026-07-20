import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { useEffect, useRef, useState } from 'react';

const MAX_MERMAID_ROWS = 24;
const MIN_MERMAID_ROWS = 6;

export function MermaidNodeView({
  deleteNode,
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const source = String(node.attrs.source ?? '');
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const closeTimerRef = useRef<number>();
  const rows = Math.min(
    MAX_MERMAID_ROWS,
    Math.max(MIN_MERMAID_ROWS, source.split(/\r?\n/).length + 1),
  );

  useEffect(() => {
    if (!selected) {
      setToolbarOpen(false);
    }
  }, [selected]);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setToolbarOpen(false);
      closeTimerRef.current = undefined;
    }, 120);
  };

  const selectMermaidNode = () => {
    const position = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof position === 'number') {
      editor.chain().focus().setNodeSelection(position).run();
    }
  };

  const copyCurrentNode = () => {
    void copyMermaidNodeAsRichContent(node, editor.schema, source);
  };

  const deleteCurrentNode = () => {
    setToolbarOpen(false);
    deleteNode();
  };

  return (
    <NodeViewWrapper
      as="section"
      className={`mermaid-node group relative rounded-xl border bg-gray-50 p-4 ${selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
      data-type="mermaid"
    >
      {selected ? (
        <div
          className="mermaid-node-side-handle"
          contentEditable={false}
          onPointerEnter={() => {
            cancelClose();
            setToolbarOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          <button
            aria-label="Mermaid 操作"
            className="mermaid-node-handle-button"
            title="Mermaid 操作"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectMermaidNode();
              setToolbarOpen(true);
            }}
          >
            <MermaidHandleIcon />
          </button>
          {toolbarOpen ? (
            <div
              aria-label="Mermaid 节点操作"
              className="mermaid-node-toolbar"
              role="toolbar"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                aria-label="复制 Mermaid 节点"
                className="mermaid-node-toolbar-button"
                title="复制 Mermaid 节点"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  copyCurrentNode();
                }}
              >
                <MermaidActionIcon type="copy" />
              </button>
              <button
                aria-label="删除 Mermaid 节点"
                className="mermaid-node-toolbar-button mermaid-node-toolbar-button-danger"
                title="删除 Mermaid 节点"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteCurrentNode();
                }}
              >
                <MermaidActionIcon type="delete" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <header className="mb-2 flex items-center justify-between gap-3" contentEditable={false}>
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">Mermaid</span>
        <span className="text-xs text-gray-400">编辑源码后自动保存</span>
      </header>
      <textarea
        value={source}
        rows={rows}
        spellCheck={false}
        className="mermaid-source-editor"
        aria-label="Mermaid 源码"
        onChange={(event) => updateAttributes({ source: event.target.value })}
      />
    </NodeViewWrapper>
  );
}

async function copyMermaidNodeAsRichContent(
  node: ProseMirrorNode,
  schema: Schema,
  plainText: string,
): Promise<void> {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeNode(node));
  const html = container.innerHTML;

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      // Fallback to the synchronous copy event below for restricted browsers.
    }
  }

  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData('text/html', html);
    event.clipboardData?.setData('text/plain', plainText);
  };
  document.addEventListener('copy', handleCopy, { once: true });
  document.execCommand('copy');
}

function MermaidHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M12 4.5 19.5 12 12 19.5 4.5 12 12 4.5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MermaidActionIcon({ type }: { type: 'copy' | 'delete' }) {
  if (type === 'delete') {
    return (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M9 4h6m-9 4h12m-10 0 .7 11h6.6L16 8M10 11v5m4-5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M8 8h10v10H8V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
