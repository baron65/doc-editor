import type { DocumentContent, DocumentTreeNode } from '../../types/documentCenter';
import { normalizeMarkdownAttachments } from '../content/attachmentContent';

export interface HeadingItem {
  id: string;
  level: 2 | 3;
  text: string;
}

export interface DocumentNavigationItem {
  id: string;
  title: string;
}

export interface HeadingPosition {
  id: string;
  top: number;
}

export function buildReaderContent(content: DocumentContent) {
  const headings: HeadingItem[] = [];
  const slugCounts = new Map<string, number>();

  function visit(node: DocumentContent, orderedNumber?: number): DocumentContent {
    if (node.type === 'orderedList') {
      const start = positiveInteger(node.attrs?.start);
      return {
        ...node,
        content: node.content?.map((child, index) => visit(child, start + index)),
      };
    }
    if (node.type === 'listItem') {
      return {
        ...node,
        content: node.content?.map((child, index) => visit(
          child,
          index === 0 ? orderedNumber : undefined,
        )),
      };
    }

    const children = node.content?.map((child) => visit(child));
    if (node.type !== 'heading') {
      return { ...node, content: children };
    }
    const level = Number(node.attrs?.level);
    if (level !== 2 && level !== 3) {
      return { ...node, content: children };
    }
    const headingText = extractText(node).trim() || '未命名章节';
    const text = orderedNumber === undefined
      ? headingText
      : `${orderedNumber}. ${headingText}`;
    // Keep anchors stable when a heading is converted to or from an ordered
    // list. The number is presentation metadata rather than heading content.
    const baseSlug = slugify(headingText);
    const count = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, count);
    const id = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    headings.push({ id, level, text });
    return {
      ...node,
      attrs: { ...node.attrs, readerId: id },
      content: children,
    };
  }

  return { content: visit(normalizeMarkdownAttachments(content)), headings };
}

function positiveInteger(value: unknown) {
  const number = Number(value ?? 1);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

export function getDocumentNavigation(nodes: DocumentTreeNode[], documentId: string) {
  const documents = flattenDocuments(nodes);
  const index = documents.findIndex((node) => node.id === documentId);
  if (index < 0) {
    return {};
  }
  return {
    previous: toNavigationItem(documents[index - 1]),
    next: toNavigationItem(documents[index + 1]),
  };
}

export function selectActiveHeadingId(positions: HeadingPosition[], threshold: number) {
  if (!positions.length) {
    return undefined;
  }
  let active = positions[0].id;
  for (const position of positions) {
    if (position.top > threshold) {
      break;
    }
    active = position.id;
  }
  return active;
}

function flattenDocuments(nodes: DocumentTreeNode[]): DocumentTreeNode[] {
  return nodes.flatMap((node) => node.nodeType === 'DOCUMENT'
    ? [node]
    : flattenDocuments(node.children ?? []));
}

function toNavigationItem(node: DocumentTreeNode | undefined): DocumentNavigationItem | undefined {
  return node ? { id: node.id, title: node.title } : undefined;
}

function slugify(text: string) {
  const slug = text
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function extractText(node: DocumentContent): string {
  if (node.text) {
    return node.text;
  }
  return (node.content ?? []).map(extractText).join('');
}
