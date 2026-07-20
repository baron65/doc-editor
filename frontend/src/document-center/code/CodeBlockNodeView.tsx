import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterCodeLanguages,
  findCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguages';
import { getCodeLineNumbers } from './codeLineNumbers';
import { copyText } from '../copyText';

type CopyState = 'idle' | 'copied' | 'failed';

export function CodeBlockNodeView({
  deleteNode,
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [nodeToolbarOpen, setNodeToolbarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wrap, setWrap] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const menuRef = useRef<HTMLDivElement>(null);
  const closeNodeToolbarTimerRef = useRef<number>();
  const language = normalizeCodeLanguage(String(node.attrs.language ?? 'plaintext'));
  const languageMeta = findCodeLanguage(language);
  const options = useMemo(() => filterCodeLanguages(query), [query]);
  const lineNumbers = getCodeLineNumbers(node.textContent);

  useEffect(() => {
    if (!selected) {
      setNodeToolbarOpen(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setQuery('');
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setQuery('');
      }
    };

    globalThis.document.addEventListener('pointerdown', closeOnOutsideClick);
    globalThis.document.addEventListener('keydown', closeOnEscape);
    return () => {
      globalThis.document.removeEventListener('pointerdown', closeOnOutsideClick);
      globalThis.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const selectLanguage = (nextLanguage: string) => {
    updateAttributes({ language: nextLanguage });
    setMenuOpen(false);
    setQuery('');
  };

  const copy = async () => {
    setCopyState((await copyText(node.textContent)) ? 'copied' : 'failed');
    globalThis.setTimeout(() => setCopyState('idle'), 1600);
  };

  const cancelNodeToolbarClose = () => {
    if (closeNodeToolbarTimerRef.current) {
      window.clearTimeout(closeNodeToolbarTimerRef.current);
      closeNodeToolbarTimerRef.current = undefined;
    }
  };

  const scheduleNodeToolbarClose = () => {
    cancelNodeToolbarClose();
    closeNodeToolbarTimerRef.current = window.setTimeout(() => {
      setNodeToolbarOpen(false);
      closeNodeToolbarTimerRef.current = undefined;
    }, 120);
  };

  const selectCodeBlockNode = () => {
    const position = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof position === 'number') {
      editor.chain().focus().setNodeSelection(position).run();
    }
  };

  const copyCurrentNode = () => {
    void copyCodeBlockNodeAsRichContent(node, editor.schema, node.textContent);
  };

  const deleteCurrentNode = () => {
    setNodeToolbarOpen(false);
    deleteNode();
  };

  return (
    <NodeViewWrapper
      as="section"
      className={`code-block-editor my-5 overflow-visible rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] [font-family:Consolas,'Courier_New',monospace] ${selected ? 'ring-2 ring-blue-200' : ''}`}
      data-code-language={language}
    >
      {selected ? (
        <div
          className="code-block-node-side-handle"
          contentEditable={false}
          onPointerEnter={() => {
            cancelNodeToolbarClose();
            setNodeToolbarOpen(true);
          }}
          onMouseLeave={scheduleNodeToolbarClose}
        >
          <button
            aria-label="代码块操作"
            className="code-block-node-handle-button"
            title="代码块操作"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectCodeBlockNode();
              setNodeToolbarOpen(true);
            }}
          >
            <CodeBlockHandleIcon />
          </button>
          {nodeToolbarOpen ? (
            <div
              aria-label="代码块节点操作"
              className="code-block-node-toolbar"
              role="toolbar"
              onMouseEnter={cancelNodeToolbarClose}
              onMouseLeave={scheduleNodeToolbarClose}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                aria-label="复制代码块节点"
                className="code-block-node-toolbar-button"
                title="复制代码块节点"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  copyCurrentNode();
                }}
              >
                <CodeBlockActionIcon type="copy" />
              </button>
              <button
                aria-label="删除代码块节点"
                className="code-block-node-toolbar-button code-block-node-toolbar-button-danger"
                title="删除代码块节点"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteCurrentNode();
                }}
              >
                <CodeBlockActionIcon type="delete" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <header
        className="relative flex items-center justify-between gap-3 rounded-t-lg border-b border-[#3c3c3c] bg-[#252526] px-3 py-2 text-xs text-[#cccccc]"
        contentEditable={false}
      >
        <div ref={menuRef} className="relative min-w-0">
          <button
            type="button"
            className="flex max-w-52 items-center gap-2 rounded px-2 py-1 text-left hover:bg-white/10 hover:text-white"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="truncate">{languageMeta?.label ?? language}</span>
            <span aria-hidden="true" className="text-[10px]">⌄</span>
          </button>

          {menuOpen ? (
            <div className="absolute left-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-800 shadow-xl">
              <div className="border-b border-gray-100 p-2">
                <input
                  autoFocus
                  value={query}
                  placeholder="搜索语言"
                  aria-label="搜索代码语言"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div role="listbox" aria-label="代码语言" className="max-h-64 overflow-y-auto p-1">
                {options.length ? options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={language === option.value}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-100 ${language === option.value ? 'bg-blue-50 text-blue-600' : ''}`}
                    onClick={() => selectLanguage(option.value)}
                  >
                    <span>{option.label}</span>
                    {language === option.value ? <span aria-hidden="true">✓</span> : null}
                  </button>
                )) : (
                  <p className="px-3 py-6 text-center text-sm text-gray-400">没有匹配的语言</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-pressed={wrap}
            className={`rounded px-2 py-1 hover:bg-white/10 hover:text-white ${wrap ? 'bg-white/10 text-white' : ''}`}
            onClick={() => setWrap((value) => !value)}
          >
            自动换行
          </button>
          <button
            type="button"
            className="min-w-14 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
            onClick={() => void copy()}
          >
            {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制'}
          </button>
        </div>
      </header>
      <div className="flex min-w-0 bg-[#1e1e1e]">
        <ol aria-hidden="true" className="code-line-numbers m-0 list-none shrink-0 select-none border-r border-[#3c3c3c] bg-[#1e1e1e] py-4 pr-3 text-right text-sm leading-6 text-[#858585]">
          {lineNumbers.map((lineNumber) => <li key={lineNumber}>{lineNumber}</li>)}
        </ol>
        <NodeViewContent
          as="pre"
          className="hljs code-block-editor-content m-0 min-w-0 flex-1 bg-[#1e1e1e] p-4 text-sm leading-6 text-[#d4d4d4]"
          spellCheck={false}
          style={{
            whiteSpace: wrap ? 'pre-wrap' : 'pre',
            overflowWrap: wrap ? 'anywhere' : 'normal',
            overflowX: wrap ? 'hidden' : 'auto',
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}

async function copyCodeBlockNodeAsRichContent(
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

function CodeBlockHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeBlockActionIcon({ type }: { type: 'copy' | 'delete' }) {
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
