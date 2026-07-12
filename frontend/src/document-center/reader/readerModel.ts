import type { DocumentContent, DocumentTreeNode } from '../../types/documentCenter';

export interface HeadingItem {
  id: string;
  level: 2 | 3;
  text: string;
}

export interface DocumentNavigationItem {
  id: string;
  title: string;
}

export function buildReaderContent(content: DocumentContent) {
  const headings: HeadingItem[] = [];
  const slugCounts = new Map<string, number>();

  function visit(node: DocumentContent): DocumentContent {
    const children = node.content?.map(visit);
    if (node.type !== 'heading') {
      return { ...node, content: children };
    }
    const level = Number(node.attrs?.level);
    if (level !== 2 && level !== 3) {
      return { ...node, content: children };
    }
    const text = extractText(node).trim() || '未命名章节';
    const baseSlug = slugify(text);
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

  return { content: visit(content), headings };
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
