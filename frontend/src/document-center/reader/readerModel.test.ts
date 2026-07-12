import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentContent, DocumentTreeNode } from '../../types/documentCenter';
import { buildReaderContent, getDocumentNavigation } from './readerModel';

test('提取二三级标题并生成稳定且不重复的锚点', () => {
  const content: DocumentContent = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '快速开始' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '配置' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '快速开始' }] },
    ],
  };

  const result = buildReaderContent(content);

  assert.deepEqual(result.headings, [
    { id: '快速开始', level: 2, text: '快速开始' },
    { id: '配置', level: 3, text: '配置' },
    { id: '快速开始-2', level: 2, text: '快速开始' },
  ]);
  assert.equal(result.content.content?.[2].attrs?.readerId, '快速开始-2');
});

test('按文档树深度优先顺序计算上一篇和下一篇', () => {
  const tree: DocumentTreeNode[] = [
    {
      id: '1', parentId: '0', nodeType: 'DIRECTORY', title: '目录', sortOrder: 0,
      children: [
        { id: '2', parentId: '1', nodeType: 'DOCUMENT', title: '第一篇', sortOrder: 0 },
        { id: '3', parentId: '1', nodeType: 'DOCUMENT', title: '第二篇', sortOrder: 1 },
      ],
    },
    { id: '4', parentId: '0', nodeType: 'DOCUMENT', title: '第三篇', sortOrder: 1 },
  ];

  assert.deepEqual(getDocumentNavigation(tree, '3'), {
    previous: { id: '2', title: '第一篇' },
    next: { id: '4', title: '第三篇' },
  });
  assert.deepEqual(getDocumentNavigation(tree, '2'), {
    previous: undefined,
    next: { id: '3', title: '第二篇' },
  });
});
