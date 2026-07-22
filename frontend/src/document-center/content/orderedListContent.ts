import type { DocumentContent } from '@/types/documentCenter';

interface OrderedListGroup {
  key: string;
  headingLevel?: number;
  items: DocumentContent[];
}

export function normalizeOrderedListSequences(node: DocumentContent): DocumentContent {
  const normalized = normalizeNode(node);
  return normalized.length === 1
    ? normalized[0]
    : { type: 'doc', content: normalized };
}

function normalizeNode(node: DocumentContent): DocumentContent[] {
  const normalizedContent = (node.content ?? []).flatMap(normalizeNode);
  const normalizedNode = node.content
    ? { ...node, content: normalizedContent }
    : node;

  if (node.type !== 'orderedList' || normalizedContent.length < 2) {
    return [normalizedNode];
  }

  const groups = groupListItems(normalizedContent);
  if (groups.length === 1) {
    return [normalizedNode];
  }

  const headingCounters = new Map<number, number>();
  const originalStart = positiveInteger(node.attrs?.start);

  return groups.map((group, groupIndex) => {
    let start = groupIndex === 0 ? originalStart : 1;
    if (group.headingLevel !== undefined) {
      start = groupIndex === 0
        ? originalStart
        : (headingCounters.get(group.headingLevel) ?? 0) + 1;
      headingCounters.set(group.headingLevel, start + group.items.length - 1);
    }
    return {
      ...normalizedNode,
      attrs: {
        ...normalizedNode.attrs,
        start,
      },
      content: group.items,
    };
  });
}

function groupListItems(items: DocumentContent[]) {
  return items.reduce<OrderedListGroup[]>((groups, item) => {
    const firstChild = item.content?.[0];
    const headingLevel = firstChild?.type === 'heading'
      ? Number(firstChild.attrs?.level ?? 1)
      : undefined;
    const key = headingLevel === undefined ? 'body' : `heading:${headingLevel}`;
    const previous = groups[groups.length - 1];
    if (previous?.key === key) {
      previous.items.push(item);
      return groups;
    }
    groups.push({ key, headingLevel, items: [item] });
    return groups;
  }, []);
}

function positiveInteger(value: unknown) {
  const number = Number(value ?? 1);
  return Number.isInteger(number) && number > 0 ? number : 1;
}
