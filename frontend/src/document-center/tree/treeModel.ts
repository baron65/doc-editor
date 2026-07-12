import type { DocumentTreeNode } from '../../types/documentCenter';

export function filterTreeByTitle(nodes: DocumentTreeNode[], keyword: string): DocumentTreeNode[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  if (!normalizedKeyword) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterTreeByTitle(node.children ?? [], normalizedKeyword);
    const matches = node.title.toLocaleLowerCase().includes(normalizedKeyword);
    if (!matches && filteredChildren.length === 0) {
      return [];
    }
    return [{ ...node, children: filteredChildren }];
  });
}

export function collectAncestorDirectoryIds(
  nodes: DocumentTreeNode[],
  targetNodeId: string | undefined,
): Set<string> {
  if (!targetNodeId) {
    return new Set();
  }
  const ancestors = new Set<string>();

  function visit(currentNodes: DocumentTreeNode[], path: string[]): boolean {
    for (const node of currentNodes) {
      if (node.id === targetNodeId) {
        path.forEach((id) => ancestors.add(id));
        return true;
      }
      const nextPath = node.nodeType === 'DIRECTORY' ? [...path, node.id] : path;
      if (visit(node.children ?? [], nextPath)) {
        return true;
      }
    }
    return false;
  }

  visit(nodes, []);
  return ancestors;
}

export function findFirstDocumentId(nodes: DocumentTreeNode[]): string | undefined {
  for (const node of nodes) {
    if (node.nodeType === 'DOCUMENT') {
      return node.id;
    }
    const childDocumentId = findFirstDocumentId(node.children ?? []);
    if (childDocumentId) {
      return childDocumentId;
    }
  }
  return undefined;
}
