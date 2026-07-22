import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface BlockHandlePresentation {
  icon: string;
  label: string;
}

export interface DocumentBlockTarget {
  pos: number;
  end: number;
  insertionPos: number;
  selectionPos: number;
  presentationType: string;
  node: ProseMirrorNode;
}

export interface FormattableTextBlockTarget {
  pos: number;
  end: number;
  node: ProseMirrorNode;
}

const BLOCK_PRESENTATIONS: Record<string, BlockHandlePresentation> = {
  paragraph: { icon: 'T', label: '正文' },
  bulletList: { icon: '•', label: '无序列表' },
  orderedList: { icon: '1.', label: '编号列表' },
  taskList: { icon: '☑', label: '任务清单' },
  blockquote: { icon: '“', label: '引用' },
  codeBlock: { icon: '{}', label: '代码块' },
  horizontalRule: { icon: '—', label: '分割线' },
  table: { icon: '▦', label: '表格' },
  image: { icon: '▧', label: '图片' },
  attachment: { icon: '↧', label: '附件' },
  callout: { icon: '!', label: '提示块' },
  mermaid: { icon: '◇', label: 'Mermaid' },
};

export function getBlockHandlePresentation(
  nodeType: string,
  empty: boolean,
  attrs?: Record<string, unknown>,
): BlockHandlePresentation {
  if (empty && ['paragraph', 'bulletList', 'orderedList', 'taskList'].includes(nodeType)) {
    return { icon: '+', label: '添加内容' };
  }
  if (nodeType === 'heading') {
    const level = Number(attrs?.level ?? 2);
    const labels = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题'];
    return { icon: `H${level}`, label: labels[level - 1] ?? `${level}级标题` };
  }
  return BLOCK_PRESENTATIONS[nodeType] ?? { icon: '⋮', label: '块操作' };
}

export function resolveDocumentBlockTarget(
  doc: ProseMirrorNode,
  documentPosition: number,
): DocumentBlockTarget | undefined {
  const pos = Math.max(0, Math.min(documentPosition, doc.content.size));
  const resolved = doc.resolve(pos);

  for (let depth = resolved.depth; depth >= 1; depth -= 1) {
    const node = resolved.node(depth);
    if (!['listItem', 'taskItem'].includes(node.type.name)) {
      continue;
    }
    const blockPos = resolved.before(depth);
    const end = blockPos + node.nodeSize;
    return {
      pos: blockPos,
      end,
      insertionPos: end - 1,
      selectionPos: pos,
      presentationType: resolved.node(depth - 1).type.name,
      node,
    };
  }

  if (resolved.depth >= 1) {
    const node = resolved.node(1);
    const blockPos = resolved.before(1);
    const listItemTarget = resolveListContainerChildTarget(node, blockPos, resolved.parentOffset);
    if (listItemTarget) {
      return listItemTarget;
    }
    const end = blockPos + node.nodeSize;
    return {
      pos: blockPos,
      end,
      insertionPos: node.type.name === 'paragraph' && node.content.size === 0 ? blockPos : end,
      selectionPos: pos,
      presentationType: node.type.name,
      node,
    };
  }

  if (resolved.nodeAfter) {
    const node = resolved.nodeAfter;
    const listItemTarget = resolveListContainerChildTarget(node, pos, 0);
    if (listItemTarget) {
      return listItemTarget;
    }
    const end = pos + node.nodeSize;
    return {
      pos,
      end,
      insertionPos: node.type.name === 'paragraph' && node.content.size === 0 ? pos : end,
      selectionPos: Math.min(pos + 1, Math.max(pos, end - 1)),
      presentationType: node.type.name,
      node,
    };
  }

  if (resolved.nodeBefore) {
    const node = resolved.nodeBefore;
    const blockPos = pos - node.nodeSize;
    const listItemTarget = resolveListContainerChildTarget(node, blockPos, node.content.size);
    if (listItemTarget) {
      return listItemTarget;
    }
    return {
      pos: blockPos,
      end: pos,
      insertionPos: node.type.name === 'paragraph' && node.content.size === 0 ? blockPos : pos,
      selectionPos: Math.min(blockPos + 1, Math.max(blockPos, pos - 1)),
      presentationType: node.type.name,
      node,
    };
  }

  return undefined;
}

function resolveListContainerChildTarget(
  node: ProseMirrorNode,
  nodePos: number,
  offset: number,
): DocumentBlockTarget | undefined {
  if (!isListContainerNode(node)) {
    return undefined;
  }
  const after = node.childAfter(offset);
  const child = after.node
    ? after
    : node.childBefore(Math.max(0, offset));
  if (!child.node || !isListItemNode(child.node)) {
    return undefined;
  }
  const itemPos = nodePos + 1 + child.offset;
  const end = itemPos + child.node.nodeSize;
  return {
    pos: itemPos,
    end,
    insertionPos: end - 1,
    selectionPos: Math.min(itemPos + 1, Math.max(itemPos, end - 1)),
    presentationType: node.type.name,
    node: child.node,
  };
}

function isListContainerNode(node: ProseMirrorNode) {
  return ['bulletList', 'orderedList', 'taskList'].includes(node.type.name);
}

function isListItemNode(node: ProseMirrorNode) {
  return ['listItem', 'taskItem'].includes(node.type.name);
}

export function getDocumentBlockTextRange(target?: DocumentBlockTarget) {
  if (!target) {
    return undefined;
  }
  if (target.node.isTextblock) {
    return { from: target.pos + 1, to: target.end - 1 };
  }
  let from: number | undefined;
  let to: number | undefined;
  target.node.descendants((node, relativePos) => {
    if (!node.isTextblock) {
      return true;
    }
    const textFrom = target.pos + relativePos + 2;
    from ??= textFrom;
    to = textFrom + node.content.size;
    return false;
  });
  return from === undefined || to === undefined ? undefined : { from, to };
}

export function resolveFormattableTextBlockTarget(
  target?: DocumentBlockTarget,
): FormattableTextBlockTarget | undefined {
  if (!target) {
    return undefined;
  }
  if (target.node.isTextblock && ['paragraph', 'heading'].includes(target.node.type.name)) {
    return { pos: target.pos, end: target.end, node: target.node };
  }
  let result: FormattableTextBlockTarget | undefined;
  target.node.descendants((node, relativePos) => {
    if (result || !node.isTextblock || !['paragraph', 'heading'].includes(node.type.name)) {
      return !result;
    }
    const pos = target.pos + relativePos + 1;
    result = { pos, end: pos + node.nodeSize, node };
    return false;
  });
  return result;
}

export function getNextOrderedHeadingStart(
  doc: ProseMirrorNode,
  beforePos: number,
  headingLevel: number,
) {
  let previousNumber = 0;

  doc.descendants((node, pos) => {
    if (pos >= beforePos) {
      return false;
    }
    if (node.type.name !== 'orderedList') {
      return true;
    }

    const start = Math.max(1, Number(node.attrs.start ?? 1));
    let sameLevelHeadingCount = 0;
    node.forEach((item) => {
      const firstChild = item.firstChild;
      if (
        firstChild?.type.name === 'heading'
        && Number(firstChild.attrs.level) === headingLevel
      ) {
        previousNumber = start + sameLevelHeadingCount;
        sameLevelHeadingCount += 1;
      }
    });
    return false;
  });

  return previousNumber > 0 ? previousNumber + 1 : 1;
}

export function getOrderedListStartForBlock(
  doc: ProseMirrorNode,
  beforePos: number,
  textBlock: ProseMirrorNode,
) {
  if (textBlock.type.name !== 'heading') {
    return 1;
  }
  return getNextOrderedHeadingStart(
    doc,
    beforePos,
    Number(textBlock.attrs.level ?? 1),
  );
}

export function getBlockMenuSide(
  handleViewportLeft: number,
  viewportWidth: number,
  popupWidth = 240,
): 'left' | 'right' {
  const gutter = 44;
  const leftSpace = handleViewportLeft - gutter;
  const rightSpace = viewportWidth - handleViewportLeft - gutter;
  return leftSpace >= popupWidth || leftSpace >= rightSpace ? 'left' : 'right';
}
