import type { DocumentContent, PublishedDocumentDetail } from '../../types/documentCenter';
import { buildAssetUrl } from '../reader/assetPresentation';
import { extractDocumentText, isMermaidLanguage } from '../content/mermaidContent';
import { isSafeAttachmentHref } from '../attachment/attachmentLink';

type ExportableDocument = Pick<PublishedDocumentDetail, 'documentId' | 'title' | 'content' | 'publishedAt'>;

interface MarkdownExportOptions {
  assetScope?: 'published' | 'admin';
}

export function exportDocumentAsMarkdown(
  document: ExportableDocument,
  options: MarkdownExportOptions = {},
): string {
  const parts = [
    `# ${escapeMarkdownText(document.title || '未命名文档')}`,
    document.publishedAt ? `> 最后发布：${document.publishedAt}` : '',
    renderBlocks(document.content.content, document.documentId, options.assetScope ?? 'published'),
  ].filter(Boolean);

  return `${parts.join('\n\n').trim()}\n`;
}

export function downloadMarkdown(document: ExportableDocument) {
  const markdown = exportDocumentAsMarkdown(document);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = buildMarkdownFileName(document.title);
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printDocumentAsPdf() {
  window.print();
}

export function buildMarkdownFileName(title: string) {
  const safeTitle = title
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();
  return `${safeTitle || 'document'}.md`;
}

function renderBlocks(nodes: DocumentContent[] | undefined, documentId: string, assetScope: 'published' | 'admin'): string {
  return (nodes ?? [])
    .map((node) => renderBlock(node, documentId, assetScope))
    .filter(Boolean)
    .join('\n\n');
}

function renderBlock(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin'): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content, documentId, assetScope);
    case 'heading': {
      const level = clampHeadingLevel(node.attrs?.level);
      return `${'#'.repeat(level)} ${renderInline(node.content, documentId, assetScope)}`.trim();
    }
    case 'bulletList':
      return renderList(node, documentId, assetScope, false);
    case 'orderedList':
      return renderList(node, documentId, assetScope, true);
    case 'taskList':
      return renderTaskList(node, documentId, assetScope);
    case 'listItem':
      return renderInline(node.content, documentId, assetScope);
    case 'taskItem':
      return renderInline(node.content, documentId, assetScope);
    case 'blockquote':
      return prefixLines(renderBlocks(node.content, documentId, assetScope), '> ');
    case 'codeBlock': {
      const code = extractDocumentText(node);
      const language = stringAttribute(node.attrs?.language);
      if (isMermaidLanguage(language)) {
        return fencedCode('mermaid', code);
      }
      return fencedCode(language || '', code);
    }
    case 'horizontalRule':
      return '---';
    case 'hardBreak':
      return '  \n';
    case 'table':
      return renderTable(node, documentId, assetScope);
    case 'callout': {
      const kind = stringAttribute(node.attrs?.kind) || 'info';
      return `> [!${kind.toUpperCase()}]\n${prefixLines(renderBlocks(node.content, documentId, assetScope), '> ')}`;
    }
    case 'image':
      return renderImage(node, documentId, assetScope);
    case 'attachment':
      return renderAttachment(node, documentId, assetScope);
    case 'mermaid':
      return fencedCode('mermaid', stringAttribute(node.attrs?.source) || '');
    case 'text':
      return renderTextNode(node);
    default:
      return renderBlocks(node.content, documentId, assetScope);
  }
}

function renderInline(nodes: DocumentContent[] | undefined, documentId: string, assetScope: 'published' | 'admin'): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === 'text') {
        return renderTextNode(node);
      }
      if (node.type === 'hardBreak') {
        return '  \n';
      }
      return renderBlock(node, documentId, assetScope);
    })
    .join('');
}

function renderTextNode(node: DocumentContent) {
  return (node.marks ?? []).reduce((current, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${current}**`;
      case 'italic':
        return `*${current}*`;
      case 'underline':
        return `<u>${escapeHtml(current)}</u>`;
      case 'strike':
        return `~~${current}~~`;
      case 'code':
        return inlineCode(current);
      case 'link': {
        const href = stringAttribute(mark.attrs?.href);
        return href ? `[${current}](${href})` : current;
      }
      default:
        return current;
    }
  }, escapeMarkdownText(node.text ?? ''));
}

function renderList(
  node: DocumentContent,
  documentId: string,
  assetScope: 'published' | 'admin',
  ordered: boolean,
): string {
  const start = ordered ? positiveIntegerAttribute(node.attrs?.start) : 1;
  return (node.content ?? [])
    .map((item, index) => ordered
      ? renderOrderedListItem(item, start + index, documentId, assetScope)
      : `- ${renderListItem(item, documentId, assetScope)}`)
    .join('\n');
}

function renderOrderedListItem(
  node: DocumentContent,
  number: number,
  documentId: string,
  assetScope: 'published' | 'admin',
) {
  const content = node.content ?? [];
  const first = content[0];
  if (first?.type !== 'heading') {
    return `${number}. ${renderListItem(node, documentId, assetScope)}`;
  }

  const level = clampHeadingLevel(first.attrs?.level);
  const heading = `${'#'.repeat(level)} ${number}. ${renderInline(first.content, documentId, assetScope)}`.trim();
  const rest = renderBlocks(content.slice(1), documentId, assetScope);
  return rest ? `${heading}\n\n${rest}` : heading;
}

function renderTaskList(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin'): string {
  return (node.content ?? [])
    .map((item) => `- [${item.attrs?.checked === true ? 'x' : ' '}] ${renderListItem(item, documentId, assetScope)}`)
    .join('\n');
}

function renderListItem(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  const content = node.content ?? [];
  const first = content[0];
  const firstLine = first?.type === 'paragraph'
    ? renderInline(first.content, documentId, assetScope)
    : renderBlocks([first].filter(Boolean) as DocumentContent[], documentId, assetScope);
  const rest = renderBlocks(content.slice(1), documentId, assetScope);
  return rest ? `${firstLine}\n${prefixLines(rest, '  ')}` : firstLine;
}

function renderImage(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  const alt = stringAttribute(node.attrs?.alt) || '';
  const caption = stringAttribute(node.attrs?.caption) || '';
  const src = node.attrs?.assetId
    ? toOnlineUrl(buildAssetUrl(documentId, String(node.attrs.assetId), assetScope))
    : stringAttribute(node.attrs?.src) || '';
  return `${`![${escapeMarkdownLinkLabel(alt)}](${src})`}${caption ? `\n\n> ${caption}` : ''}`;
}

function renderAttachment(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  const assetId = stringAttribute(node.attrs?.assetId);
  const originalName = stringAttribute(node.attrs?.originalName) || '附件';
  const attachmentHref = node.attrs?.href;
  const href = assetId
    ? toOnlineUrl(buildAssetUrl(documentId, assetId, assetScope))
    : isSafeAttachmentHref(attachmentHref)
      ? attachmentHref.trim()
      : '#';
  return `📎 [${escapeMarkdownLinkLabel(originalName)}](${href})`;
}

function renderTable(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  if (isComplexTable(node)) {
    return renderHtmlTable(node, documentId, assetScope);
  }

  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow');
  if (!rows.length) {
    return '';
  }
  const renderedRows = rows.map((row) => (row.content ?? []).map((cell) => renderPlainCell(cell, documentId, assetScope)));
  const columnCount = Math.max(...renderedRows.map((row) => row.length));
  const normalizedRows = renderedRows.map((row) => normalizeTableRow(row, columnCount));
  const [header, ...body] = normalizedRows;
  return [
    pipeTableRow(header),
    pipeTableRow(Array.from({ length: columnCount }, () => '---')),
    ...body.map(pipeTableRow),
  ].join('\n');
}

function renderHtmlTable(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow');
  const htmlRows = rows.map((row) => {
    const cells = (row.content ?? []).map((cell) => {
      const tag = cell.type === 'tableHeader' ? 'th' : 'td';
      const attrs = [
        tableSpanAttribute('colspan', cell.attrs?.colspan),
        tableSpanAttribute('rowspan', cell.attrs?.rowspan),
      ].filter(Boolean).join(' ');
      return `<${tag}${attrs ? ` ${attrs}` : ''}>${escapeHtml(renderPlainCell(cell, documentId, assetScope))}</${tag}>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');
  return `<table>\n${htmlRows}\n</table>`;
}

function isComplexTable(node: DocumentContent) {
  return (node.content ?? []).some((row) => (row.content ?? []).some((cell) => {
    const colspan = Number(cell.attrs?.colspan ?? 1);
    const rowspan = Number(cell.attrs?.rowspan ?? 1);
    return colspan > 1
      || rowspan > 1
      || Boolean(cell.attrs?.backgroundColor)
      || Boolean(cell.attrs?.colwidth);
  }));
}

function renderPlainCell(node: DocumentContent, documentId: string, assetScope: 'published' | 'admin') {
  return renderBlocks(node.content, documentId, assetScope)
    .replace(/\n+/g, '<br>')
    .trim();
}

function normalizeTableRow(row: string[], columnCount: number) {
  return [...row, ...Array.from({ length: Math.max(0, columnCount - row.length) }, () => '')];
}

function pipeTableRow(row: string[]) {
  return `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`;
}

function tableSpanAttribute(name: 'colspan' | 'rowspan', value: unknown) {
  const span = Number(value ?? 1);
  return Number.isInteger(span) && span > 1 ? `${name}="${span}"` : '';
}

function fencedCode(language: string, code: string) {
  return `\`\`\`${language}\n${code.replace(/\n+$/g, '')}\n\`\`\``;
}

function inlineCode(text: string) {
  const delimiter = text.includes('`') ? '``' : '`';
  return `${delimiter}${text}${delimiter}`;
}

function prefixLines(text: string, prefix: string) {
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function clampHeadingLevel(value: unknown) {
  const level = Number(value ?? 1);
  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 1;
}

function stringAttribute(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function positiveIntegerAttribute(value: unknown) {
  const number = Number(value ?? 1);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

function toOnlineUrl(path: string) {
  const origin = typeof globalThis.location?.origin === 'string' ? globalThis.location.origin : '';
  return path.startsWith('/') && origin ? `${origin}${path}` : path;
}

function escapeMarkdownText(text: string) {
  return text.replace(/([\\*_[\]()#])/g, '\\$1');
}

function escapeMarkdownLinkLabel(text: string) {
  return text.replace(/([\\[\]])/g, '\\$1');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
