import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IMAGE_NODE_ACTION_EVENT, type ImageNodeAction } from './ImageNodeAction';

export function ImageNodeView({ deleteNode, editor, getPos, node, selected }: ReactNodeViewProps) {
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const closeTimerRef = useRef<number>();
  const src = String(node.attrs.src ?? '');
  const alt = String(node.attrs.alt ?? '');
  const title = String(node.attrs.title ?? '');
  const caption = String(node.attrs.caption ?? '');
  const assetId = String(node.attrs.assetId ?? '');

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

  const getPosition = () => {
    const position = typeof getPos === 'function' ? getPos() : undefined;
    return typeof position === 'number' ? position : undefined;
  };

  const selectImageNode = () => {
    const position = getPosition();
    if (typeof position === 'number') {
      editor.chain().focus().setNodeSelection(position).run();
    }
  };

  const runImageAction = (action: ImageNodeAction) => {
    const position = getPosition();
    if (typeof position !== 'number') return;
    selectImageNode();
    editor.view.dom.dispatchEvent(new CustomEvent(IMAGE_NODE_ACTION_EVENT, {
      bubbles: true,
      detail: { action, position },
    }));
  };

  const copyCurrentNode = () => {
    void copyImageNodeAsRichContent(node, editor.schema, alt || title || caption || '图片');
  };

  const deleteCurrentNode = () => {
    setToolbarOpen(false);
    deleteNode();
  };

  return (
    <NodeViewWrapper
      as="figure"
      className={`document-image image-node-view ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      data-type="image"
      data-asset-id={assetId || undefined}
    >
      {selected ? (
        <div
          className="image-node-side-handle"
          contentEditable={false}
          onPointerEnter={() => {
            cancelClose();
            setToolbarOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          <button
            aria-label="图片操作"
            className="image-node-handle-button"
            title="图片操作"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectImageNode();
              setToolbarOpen(true);
            }}
          >
            <ImageHandleIcon />
          </button>
          {toolbarOpen ? (
            <div
              aria-label="图片节点操作"
              className="image-node-toolbar"
              role="toolbar"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <ImageToolbarButton label="替换图片" onRun={() => runImageAction('replace')}><ImageActionIcon type="replace" /></ImageToolbarButton>
              <ImageToolbarButton label="替代文本" onRun={() => runImageAction('alt')}><ImageActionIcon type="text" /></ImageToolbarButton>
              <ImageToolbarButton label="图片说明" onRun={() => runImageAction('caption')}><ImageActionIcon type="caption" /></ImageToolbarButton>
              <ImageToolbarButton label="复制图片节点" onRun={copyCurrentNode}><ImageActionIcon type="copy" /></ImageToolbarButton>
              <ImageToolbarButton danger label="删除图片节点" onRun={deleteCurrentNode}><ImageActionIcon type="delete" /></ImageToolbarButton>
            </div>
          ) : null}
        </div>
      ) : null}
      <img src={src} alt={alt} title={title} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </NodeViewWrapper>
  );
}

function ImageToolbarButton({
  children,
  danger,
  label,
  onRun,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onRun: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`image-node-toolbar-button ${danger ? 'image-node-toolbar-button-danger' : ''}`}
      title={label}
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRun();
      }}
    >
      {children}
    </button>
  );
}

async function copyImageNodeAsRichContent(
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

function ImageToolbarButtonPath({ d }: { d: string }) {
  return <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
}

function ImageHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-11Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m7 16 3.2-3.2a1 1 0 0 1 1.4 0L13 14.2l1.5-1.5a1 1 0 0 1 1.4 0L19 15.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ImageActionIcon({ type }: { type: 'replace' | 'text' | 'caption' | 'copy' | 'delete' }) {
  if (type === 'delete') {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><ImageToolbarButtonPath d="M9 4h6m-9 4h12m-10 0 .7 11h6.6L16 8M10 11v5m4-5v5" /></svg>;
  }
  if (type === 'copy') {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><ImageToolbarButtonPath d="M8 8h10v10H8V8Z" /><ImageToolbarButtonPath d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
  }
  if (type === 'replace') {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><ImageToolbarButtonPath d="M4 7h11a4 4 0 0 1 0 8H7" /><ImageToolbarButtonPath d="m7 11-3 4 3 4" /></svg>;
  }
  if (type === 'caption') {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><ImageToolbarButtonPath d="M5 6h14M5 11h14M5 16h8" /></svg>;
  }
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><ImageToolbarButtonPath d="M5 6h14M12 6v12M8 18h8" /></svg>;
}
