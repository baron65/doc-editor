import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';

const MAX_MERMAID_ROWS = 24;
const MIN_MERMAID_ROWS = 6;

export function MermaidNodeView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const source = String(node.attrs.source ?? '');
  const rows = Math.min(
    MAX_MERMAID_ROWS,
    Math.max(MIN_MERMAID_ROWS, source.split(/\r?\n/).length + 1),
  );

  return (
    <NodeViewWrapper
      as="section"
      className={`mermaid-node rounded-xl border bg-gray-50 p-4 ${selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
      data-type="mermaid"
    >
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
