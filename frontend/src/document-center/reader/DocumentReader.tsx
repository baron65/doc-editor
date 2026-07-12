import { useMemo, type ReactNode } from 'react';
import { MermaidRenderer } from '../mermaid/MermaidRenderer';
import type { DocumentContent } from '../../types/documentCenter';
import { buildAssetUrl, formatFileSize, type AssetScope } from './assetPresentation';
import { buildReaderContent, type DocumentNavigationItem } from './readerModel';

export interface ReaderDocument {
  documentId: string;
  title: string;
  content: DocumentContent;
  publishedAt?: string;
}

interface DocumentReaderProps {
  document?: ReaderDocument;
  assetScope?: AssetScope;
  previous?: DocumentNavigationItem;
  next?: DocumentNavigationItem;
}

export function DocumentReader({ document, assetScope = 'published', previous, next }: DocumentReaderProps) {
  const readerContent = useMemo(
    () => buildReaderContent(document?.content ?? { type: 'doc', content: [] }),
    [document?.content],
  );
  if (!document) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择左侧文档
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-6">
      <article className="document-content min-w-0 flex-1 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-semibold text-gray-950">{document.title}</h1>
        {document.publishedAt ? (
          <div className="mb-6 text-xs text-gray-400">最后发布：{formatPublishedAt(document.publishedAt)}</div>
        ) : <div className="mb-4" />}
        <div className="space-y-3">
          {renderChildren(readerContent.content.content, document.documentId, assetScope)}
        </div>
        {previous || next ? (
          <nav className="mt-10 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6" aria-label="文档前后篇导航">
            <NavigationLink direction="previous" item={previous} />
            <NavigationLink direction="next" item={next} />
          </nav>
        ) : null}
      </article>
      {readerContent.headings.length ? (
        <aside className="sticky top-8 hidden w-52 shrink-0 rounded-xl bg-white p-4 text-sm shadow-sm xl:block">
          <div className="mb-3 font-medium text-gray-800">本页目录</div>
          <nav className="space-y-2" aria-label="页内目录">
            {readerContent.headings.map((heading) => (
              <a
                key={heading.id}
                className={`block text-gray-500 hover:text-brand-600 ${heading.level === 3 ? 'pl-3 text-xs' : ''}`}
                href={`#${heading.id}`}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}
    </div>
  );
}

function renderChildren(nodes: DocumentContent[] | undefined, documentId: string, assetScope: AssetScope): ReactNode {
  if (!nodes?.length) {
    return <p className="text-gray-500">暂无正文内容</p>;
  }
  return nodes.map((node, index) => renderNode(node, documentId, assetScope, index));
}

function renderNode(node: DocumentContent, documentId: string, assetScope: AssetScope, key: number): ReactNode {
  const children = renderInlineChildren(node.content, documentId, assetScope);
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 1) {
        return <h1 key={key}>{children}</h1>;
      }
      if (level === 3) {
        return <h3 id={stringAttribute(node.attrs?.readerId)} key={key}>{children}</h3>;
      }
      return <h2 id={stringAttribute(node.attrs?.readerId)} key={key}>{children}</h2>;
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node.content, documentId, assetScope)}</ul>;
    case 'orderedList':
      return <ol key={key}>{renderChildren(node.content, documentId, assetScope)}</ol>;
    case 'listItem':
      return <li key={key}>{renderInlineChildren(node.content, documentId, assetScope)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node.content, documentId, assetScope)}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{extractText(node)}</code>
        </pre>
      );
    case 'table':
      return (
        <div key={key} className="my-5 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>{renderChildren(node.content, documentId, assetScope)}</tbody>
          </table>
        </div>
      );
    case 'tableRow':
      return <tr key={key} className="border-b border-gray-200 last:border-b-0">{renderChildren(node.content, documentId, assetScope)}</tr>;
    case 'tableHeader':
      return <th key={key} className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">{renderChildren(node.content, documentId, assetScope)}</th>;
    case 'tableCell':
      return <td key={key} className="px-4 py-3 align-top text-gray-700">{renderChildren(node.content, documentId, assetScope)}</td>;
    case 'callout': {
      const kind = typeof node.attrs?.kind === 'string' ? node.attrs.kind : 'info';
      const style = calloutStyle(kind);
      return (
        <aside key={key} data-callout-kind={kind} className={`my-4 rounded-xl border px-4 py-3 ${style}`}>
          {renderChildren(node.content, documentId, assetScope)}
        </aside>
      );
    }
    case 'image':
      return renderImage(node, documentId, assetScope, key);
    case 'attachment':
      return renderAttachment(node, documentId, assetScope, key);
    case 'mermaid':
      return renderMermaid(node, key);
    default:
      return <div key={key}>{children}</div>;
  }
}

function renderInlineChildren(nodes: DocumentContent[] | undefined, documentId: string, assetScope: AssetScope): ReactNode {
  if (!nodes?.length) {
    return null;
  }
  return nodes.map((node, index) => {
    if (node.type === 'text') {
      return applyMarks(node.text ?? '', node, index);
    }
    return renderNode(node, documentId, assetScope, index);
  });
}

function applyMarks(text: string, node: DocumentContent, key: number): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((current, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{current}</strong>;
      case 'italic':
        return <em>{current}</em>;
      case 'underline':
        return <u>{current}</u>;
      case 'code':
        return <code>{current}</code>;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {current}
          </a>
        );
      }
      default:
        return current;
    }
  }, <span key={key}>{text}</span>);
}

function renderImage(node: DocumentContent, documentId: string, assetScope: AssetScope, key: number) {
  const assetId = node.attrs?.assetId;
  const src = assetId
    ? buildAssetUrl(documentId, String(assetId), assetScope)
    : typeof node.attrs?.src === 'string'
      ? node.attrs.src
      : '';
  const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
  const caption = typeof node.attrs?.caption === 'string' ? node.attrs.caption : '';
  return (
    <figure key={key}>
      <img className="rounded-xl border border-gray-100" src={src} alt={alt} />
      {caption ? <figcaption className="mt-2 text-center text-sm text-gray-500">{caption}</figcaption> : null}
    </figure>
  );
}

function renderAttachment(node: DocumentContent, documentId: string, assetScope: AssetScope, key: number) {
  const assetId = typeof node.attrs?.assetId === 'string' ? node.attrs.assetId : '';
  const originalName = typeof node.attrs?.originalName === 'string' ? node.attrs.originalName : '附件';
  const mimeType = typeof node.attrs?.mimeType === 'string' ? node.attrs.mimeType : 'application/octet-stream';
  const sizeBytes = typeof node.attrs?.sizeBytes === 'string' ? node.attrs.sizeBytes : '0';
  const href = assetId ? buildAssetUrl(documentId, assetId, assetScope) : '#';
  return (
    <div key={key} className="my-4 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-800">{originalName}</div>
        <div className="mt-1 text-xs text-gray-500">{mimeType} · {formatFileSize(sizeBytes)}</div>
      </div>
      <a className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm" href={href} download>
        下载
      </a>
    </div>
  );
}

function renderMermaid(node: DocumentContent, key: number) {
  const source = typeof node.attrs?.source === 'string' ? node.attrs.source : '';
  return <MermaidRenderer key={key} source={source} />;
}

function extractText(node: DocumentContent): string {
  if (node.text) {
    return node.text;
  }
  return (node.content ?? []).map(extractText).join('');
}

function calloutStyle(kind: string) {
  switch (kind) {
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-900';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-900';
  }
}

function NavigationLink({ direction, item }: { direction: 'previous' | 'next'; item?: DocumentNavigationItem }) {
  if (!item) {
    return <span />;
  }
  const isNext = direction === 'next';
  return (
    <a
      className={`rounded-lg border border-gray-200 px-4 py-3 hover:border-brand-200 hover:bg-brand-50 ${isNext ? 'text-right' : ''}`}
      href={`/document-center/${item.id}`}
    >
      <span className="block text-xs text-gray-400">{isNext ? '下一篇' : '上一篇'}</span>
      <span className="mt-1 block truncate text-sm font-medium text-gray-700">{item.title}</span>
    </a>
  );
}

function stringAttribute(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function formatPublishedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
