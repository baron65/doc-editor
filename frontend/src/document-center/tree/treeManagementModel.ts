import type { DocumentTreeNode } from '../../types/documentCenter';

export interface MoveTargetDirectory {
  id: string;
  title: string;
  depth: number;
}

export function flattenTreeNodes(nodes: DocumentTreeNode[]): DocumentTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTreeNodes(node.children ?? [])]);
}

export function getMoveTargetDirectories(
  nodes: DocumentTreeNode[],
  selectedNode?: DocumentTreeNode,
): MoveTargetDirectory[] {
  const excludedIds = selectedNode?.nodeType === 'DIRECTORY'
    ? collectNodeIds(selectedNode)
    : new Set<string>();
  const targets: MoveTargetDirectory[] = [{ id: '0', title: '根目录', depth: 0 }];

  const visit = (items: DocumentTreeNode[], depth: number) => {
    items.forEach((node) => {
      if (node.nodeType !== 'DIRECTORY' || excludedIds.has(node.id)) {
        return;
      }
      targets.push({ id: node.id, title: node.title, depth });
      visit(node.children ?? [], depth + 1);
    });
  };
  visit(nodes, 1);
  return targets;
}

export function getTargetAppendIndex(
  nodes: DocumentTreeNode[],
  targetParentId: string,
  movingNode?: DocumentTreeNode,
) {
  return flattenTreeNodes(nodes).filter(
    (node) => node.parentId === targetParentId && node.id !== movingNode?.id,
  ).length;
}

export function getDropDestination(
  nodes: DocumentTreeNode[],
  movingNode?: DocumentTreeNode,
  targetNode?: DocumentTreeNode,
) {
  if (!movingNode || !targetNode || movingNode.id === targetNode.id) {
    return undefined;
  }
  const targetParentId = targetNode.nodeType === 'DIRECTORY' ? targetNode.id : targetNode.parentId;
  const allowedTargets = getMoveTargetDirectories(nodes, movingNode);
  if (!allowedTargets.some((target) => target.id === targetParentId)) {
    return undefined;
  }
  if (targetNode.nodeType === 'DIRECTORY') {
    return {
      targetParentId,
      targetIndex: (targetNode.children ?? []).filter((child) => child.id !== movingNode.id).length,
    };
  }
  const siblings = flattenTreeNodes(nodes)
    .filter((node) => node.parentId === targetParentId && node.id !== movingNode.id)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  return {
    targetParentId,
    targetIndex: siblings.findIndex((node) => node.id === targetNode.id),
  };
}

function collectNodeIds(node: DocumentTreeNode): Set<string> {
  const ids = new Set<string>([node.id]);
  (node.children ?? []).forEach((child) => {
    collectNodeIds(child).forEach((id) => ids.add(id));
  });
  return ids;
}
