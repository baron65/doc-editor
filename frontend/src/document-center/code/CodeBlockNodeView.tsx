import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterCodeLanguages,
  findCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguages';

type CopyState = 'idle' | 'copied' | 'failed';

export function CodeBlockNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wrap, setWrap] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const menuRef = useRef<HTMLDivElement>(null);
  const language = normalizeCodeLanguage(String(node.attrs.language ?? 'plaintext'));
  const languageMeta = findCodeLanguage(language);
  const options = useMemo(() => filterCodeLanguages(query), [query]);

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
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(node.textContent);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    globalThis.setTimeout(() => setCopyState('idle'), 1600);
  };

  return (
    <NodeViewWrapper
      as="section"
      className="code-block-editor my-5 overflow-visible rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] [font-family:Consolas,'Courier_New',monospace]"
      data-code-language={language}
    >
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
      <NodeViewContent
        as="pre"
        className="code-block-editor-content m-0 bg-[#1e1e1e] p-4 text-sm leading-6 text-[#d4d4d4]"
        spellCheck={false}
        style={{
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          overflowWrap: wrap ? 'anywhere' : 'normal',
          overflowX: wrap ? 'hidden' : 'auto',
        }}
      />
    </NodeViewWrapper>
  );
}
