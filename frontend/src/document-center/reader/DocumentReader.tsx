import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MermaidRenderer } from '../mermaid/MermaidRenderer';
import type { DocumentContent } from '../../types/documentCenter';
import { buildAssetUrl, formatFileSize, type AssetScope } from './assetPresentation';
import { buildReaderContent, selectActiveHeadingId, type DocumentNavigationItem } from './readerModel';
import { CodeBlock } from './CodeBlock';
import { buildBlockTextStyle, normalizeFontSize, normalizeTextBackgroundColor, normalizeTextColor } from '../content/blockFormatting';
import { extractDocumentText, isMermaidLanguage } from '../content/mermaidContent';

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
  containedScroll?: boolean;
}

export function DocumentReader({
  document,
  assetScope = 'published',
  previous,
  next,
  containedScroll = false,
}: DocumentReaderProps) {
  const articleRef = useRef<HTMLElement>(null);
  const readerContent = useMemo(
    () => buildReaderContent(document?.content ?? { type: 'doc', content: [] }),
    [document?.content],
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string>();

  useEffect(() => {
    setActiveHeadingId(readerContent.headings[0]?.id);
    if (!readerContent.headings.length) {
      return undefined;
    }
    let animationFrame = 0;
    const updateActiveHeading = () => {
      animationFrame = 0;
      const positions = Array.from(
        articleRef.current?.querySelectorAll<HTMLElement>('[data-reader-heading-id]') ?? [],
      ).map((heading) => ({
        id: heading.dataset.readerHeadingId ?? '',
        top: heading.getBoundingClientRect().top,
      }));
      setActiveHeadingId(selectActiveHeadingId(positions, 120));
    };
    const scheduleUpdate = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateActiveHeading);
      }
    };
    scheduleUpdate();
    globalThis.document.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      globalThis.document.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [readerContent.headings]);
  if (!document) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择左侧文档
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-start gap-4 xl:gap-6 ${containedScroll ? 'h-full overflow-hidden' : ''}`}>
      <article
        ref={articleRef}
        className={`document-content min-w-0 flex-1 rounded-xl bg-white p-5 shadow-sm sm:p-6 lg:p-8 ${
          containedScroll ? 'h-full overflow-y-auto overscroll-contain' : ''
        }`}
      >
        <h1 className="mb-2 text-3xl font-semibold text-gray-950">{document.title}</h1>
        {document.publishedAt ? (
          <div className="mb-6 text-xs text-gray-400">最后发布：{formatPublishedAt(document.publishedAt)}</div>
        ) : <div className="mb-4" />}
        <div className="document-body document-content-body">
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
        <aside
          className={`sticky top-0 hidden w-52 shrink-0 overflow-y-auto rounded-xl bg-white p-4 text-sm shadow-sm xl:block ${
            containedScroll ? 'max-h-full' : 'max-h-[calc(100vh-4rem)]'
          }`}
        >
          <div className="mb-3 font-medium text-gray-800">本页目录</div>
          <nav className="space-y-2" aria-label="页内目录">
            {readerContent.headings.map((heading) => (
              <a
                key={heading.id}
                aria-current={activeHeadingId === heading.id ? 'location' : undefined}
                className={`block border-l-2 pl-2 transition-colors ${
                  activeHeadingId === heading.id
                    ? 'border-brand-500 font-medium text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-brand-600'
                } ${heading.level === 3 ? 'ml-3 text-xs' : ''}`}
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
      return <p key={key} style={buildBlockTextStyle(node.attrs)}>{children}</p>;
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      const headingProps = {
        id: stringAttribute(node.attrs?.readerId),
        'data-reader-heading-id': stringAttribute(node.attrs?.readerId),
        style: buildBlockTextStyle(node.attrs),
      };
      if (level === 1) {
        return <h1 {...headingProps} key={key}>{children}</h1>;
      }
      if (level === 3) {
        return <h3 {...headingProps} key={key}>{children}</h3>;
      }
      if (level === 4) {
        return <h4 {...headingProps} key={key}>{children}</h4>;
      }
      if (level === 5) {
        return <h5 {...headingProps} key={key}>{children}</h5>;
      }
      return <h2 {...headingProps} key={key}>{children}</h2>;
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node.content, documentId, assetScope)}</ul>;
    case 'orderedList':
      return <ol key={key}>{renderChildren(node.content, documentId, assetScope)}</ol>;
    case 'taskList':
      return <ul key={key} data-type="taskList">{renderChildren(node.content, documentId, assetScope)}</ul>;
    case 'taskItem':
      return (
        <li key={key} className="flex gap-2" data-type="taskItem" data-checked={node.attrs?.checked === true}>
          <input type="checkbox" checked={node.attrs?.checked === true} readOnly />
          <div className="min-w-0 flex-1">{renderChildren(node.content, documentId, assetScope)}</div>
        </li>
      );
    case 'listItem':
      return <li key={key}>{renderInlineChildren(node.content, documentId, assetScope)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node.content, documentId, assetScope)}</blockquote>;
    case 'codeBlock':
      if (isMermaidLanguage(node.attrs?.language)) {
        return renderMermaid({ type: 'mermaid', attrs: { source: extractDocumentText(node) } }, key);
      }
      return <CodeBlock key={key} code={extractText(node)} language={stringAttribute(node.attrs?.language)} />;
    case 'table': {
      const tableLayout = buildReaderTableLayout(node);
      return (
        <div key={key} className="document-table-wrapper">
          <table style={tableLayout.tableStyle}>
            <colgroup>
              {tableLayout.columns.map((style, columnIndex) => (
                <col key={columnIndex} style={style} />
              ))}
            </colgroup>
            <tbody>{renderChildren(node.content, documentId, assetScope)}</tbody>
          </table>
        </div>
      );
    }
    case 'tableRow':
      return <tr key={key}>{renderChildren(node.content, documentId, assetScope)}</tr>;
    case 'tableHeader':
      return <th key={key} {...buildReaderCellSpanProps(node)}>{renderChildren(node.content, documentId, assetScope)}</th>;
    case 'tableCell':
      return <td key={key} {...buildReaderCellSpanProps(node)}>{renderChildren(node.content, documentId, assetScope)}</td>;
    case 'callout': {
      const kind = typeof node.attrs?.kind === 'string' ? node.attrs.kind : 'info';
      return (
        <aside key={key} data-callout-kind={kind} className="callout-node">
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

const TABLE_CELL_MIN_WIDTH = 80;

function buildReaderTableLayout(node: DocumentContent): {
  columns: CSSProperties[];
  tableStyle: CSSProperties;
} {
  const firstRow = node.content?.[0];
  if (firstRow?.type !== 'tableRow' || !firstRow.content?.length) {
    return { columns: [], tableStyle: {} };
  }

  const columns: CSSProperties[] = [];
  let fixedWidth = true;
  let totalWidth = 0;

  for (const cell of firstRow.content) {
    const colspan = normalizeTableSpan(cell.attrs?.colspan);
    const cellColwidth = cell.attrs?.colwidth;
    const colwidth = Array.isArray(cellColwidth) ? cellColwidth : [];
    for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
      const width = normalizeTableColumnWidth(colwidth[columnOffset]);
      if (width === undefined) {
        fixedWidth = false;
        totalWidth += TABLE_CELL_MIN_WIDTH;
        columns.push({ minWidth: `${TABLE_CELL_MIN_WIDTH}px` });
      } else {
        const safeWidth = Math.max(width, TABLE_CELL_MIN_WIDTH);
        totalWidth += safeWidth;
        columns.push({ width: `${safeWidth}px` });
      }
    }
  }

  return {
    columns,
    tableStyle: fixedWidth
      ? { width: `${totalWidth}px` }
      : { minWidth: `${totalWidth}px` },
  };
}

function buildReaderCellSpanProps(node: DocumentContent): {
  colSpan?: number;
  rowSpan?: number;
} {
  const colSpan = normalizeTableSpan(node.attrs?.colspan);
  const rowSpan = normalizeTableSpan(node.attrs?.rowspan);
  return {
    colSpan: colSpan > 1 ? colSpan : undefined,
    rowSpan: rowSpan > 1 ? rowSpan : undefined,
  };
}

function normalizeTableSpan(value: unknown): number {
  const span = Number(value ?? 1);
  return Number.isInteger(span) && span > 0 ? span : 1;
}

function normalizeTableColumnWidth(value: unknown): number | undefined {
  const width = Number(value);
  return Number.isFinite(width) && width > 0 ? Math.round(width) : undefined;
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
        return <strong key={key}>{current}</strong>;
      case 'italic':
        return <em key={key}>{current}</em>;
      case 'underline':
        return <u key={key}>{current}</u>;
      case 'strike':
        return <s key={key}>{current}</s>;
      case 'code':
        return <code key={key}>{current}</code>;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        if (!isSafeHref(href)) {
          return current;
        }
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {current}
          </a>
        );
      }
      case 'textStyle': {
        const color = normalizeTextColor(mark.attrs?.color);
        const fontSize = normalizeFontSize(mark.attrs?.fontSize);
        const backgroundColor = normalizeTextBackgroundColor(mark.attrs?.backgroundColor);
        return color || fontSize || backgroundColor ? <span key={key} style={{ color: color ?? undefined, fontSize: fontSize ?? undefined, backgroundColor: backgroundColor ?? undefined }}>{current}</span> : current;
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
    <figure key={key} className="document-image">
      <img src={src} alt={alt} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function renderAttachment(node: DocumentContent, documentId: string, assetScope: AssetScope, key: number) {
  const assetId = typeof node.attrs?.assetId === 'string' ? node.attrs.assetId : '';
  const originalName = typeof node.attrs?.originalName === 'string' ? node.attrs.originalName : '附件';
  const mimeType = typeof node.attrs?.mimeType === 'string' ? node.attrs.mimeType : 'application/octet-stream';
  const sizeBytes = typeof node.attrs?.sizeBytes === 'string' ? node.attrs.sizeBytes : '0';
  const href = assetId ? buildAssetUrl(documentId, assetId, assetScope) : '#';
  const fileBadge = getFileBadge(originalName, mimeType);
  return (
    <div key={key} className="attachment-card">
      <div className="attachment-card__icon" aria-hidden="true">{fileBadge}</div>
      <div className="attachment-card__content">
        <div className="attachment-card__name">{originalName}</div>
        <div className="attachment-card__meta">{mimeType} · {formatFileSize(sizeBytes)}</div>
      </div>
      <a className="attachment-card__download" href={href} download aria-label={`下载 ${originalName}`} title="下载附件">
        ↓
      </a>
    </div>
  );
}

function getFileBadge(originalName: string, mimeType: string) {
  const extension = originalName.split('.').pop()?.trim();
  if (extension && extension !== originalName && extension.length <= 5) {
    return extension.toUpperCase();
  }
  const mimeSubtype = mimeType.split('/').pop()?.split(/[.+-]/)[0];
  return (mimeSubtype || 'FILE').slice(0, 5).toUpperCase();
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

function isSafeHref(href: string) {
  const value = href.trim();
  if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) {
    return true;
  }
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function formatPublishedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
