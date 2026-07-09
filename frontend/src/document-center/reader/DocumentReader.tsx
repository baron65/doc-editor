import type { ReactNode } from 'react';
import { MermaidRenderer } from '@/document-center/mermaid/MermaidRenderer';
import type { DocumentContent, PublishedDocumentDetail } from '@/types/documentCenter';

interface DocumentReaderProps {
  document?: PublishedDocumentDetail;
}

export function DocumentReader({ document }: DocumentReaderProps) {
  if (!document) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择左侧文档
      </div>
    );
  }

  return (
    <article className="document-content rounded-xl bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-3xl font-semibold text-gray-950">{document.title}</h1>
      <div className="space-y-3">
        {renderChildren(document.content.content, document.documentId)}
      </div>
    </article>
  );
}

function renderChildren(nodes: DocumentContent[] | undefined, documentId: string): ReactNode {
  if (!nodes?.length) {
    return <p className="text-gray-500">暂无正文内容</p>;
  }
  return nodes.map((node, index) => renderNode(node, documentId, index));
}

function renderNode(node: DocumentContent, documentId: string, key: number): ReactNode {
  const children = renderInlineChildren(node.content, documentId);
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 1) {
        return <h1 key={key}>{children}</h1>;
      }
      if (level === 3) {
        return <h3 key={key}>{children}</h3>;
      }
      return <h2 key={key}>{children}</h2>;
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node.content, documentId)}</ul>;
    case 'orderedList':
      return <ol key={key}>{renderChildren(node.content, documentId)}</ol>;
    case 'listItem':
      return <li key={key}>{renderInlineChildren(node.content, documentId)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node.content, documentId)}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{extractText(node)}</code>
        </pre>
      );
    case 'image':
      return renderImage(node, documentId, key);
    case 'mermaid':
      return renderMermaid(node, key);
    default:
      return <div key={key}>{children}</div>;
  }
}

function renderInlineChildren(nodes: DocumentContent[] | undefined, documentId: string): ReactNode {
  if (!nodes?.length) {
    return null;
  }
  return nodes.map((node, index) => {
    if (node.type === 'text') {
      return applyMarks(node.text ?? '', node, index);
    }
    return renderNode(node, documentId, index);
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

function renderImage(node: DocumentContent, documentId: string, key: number) {
  const assetId = node.attrs?.assetId;
  const src = assetId
    ? `/api/v1/document-center/documents/${documentId}/assets/${assetId}`
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
