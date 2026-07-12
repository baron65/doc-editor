import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentTreeNode } from '../../types/documentCenter';
import {
  collectAncestorDirectoryIds,
  filterTreeByTitle,
  findFirstDocumentId,
} from './treeModel';

const tree: DocumentTreeNode[] = [
  {
    id: '10',
    parentId: '0',
    nodeType: 'DIRECTORY',
    title: '模型服务',
    sortOrder: 0,
    children: [
      { id: '11', parentId: '10', nodeType: 'DOCUMENT', title: '快速接入', sortOrder: 0 },
      {
        id: '12',
        parentId: '10',
        nodeType: 'DIRECTORY',
        title: '进阶',
        sortOrder: 1,
        children: [
          { id: '13', parentId: '12', nodeType: 'DOCUMENT', title: '故障排查', sortOrder: 0 },
        ],
      },
    ],
  },
];

test('标题搜索保留命中文档及其完整目录路径', () => {
  const result = filterTreeByTitle(tree, '故障');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '10');
  assert.deepEqual(result[0].children?.map((node) => node.id), ['12']);
  assert.deepEqual(result[0].children?.[0].children?.map((node) => node.id), ['13']);
});

test('空搜索词返回原树，且匹配忽略大小写和首尾空格', () => {
  assert.equal(filterTreeByTitle(tree, ''), tree);
  assert.equal(filterTreeByTitle(tree, '  快速  ')[0].children?.[0].id, '11');
});

test('定位当前文档时收集全部祖先目录', () => {
  assert.deepEqual(collectAncestorDirectoryIds(tree, '13'), new Set(['10', '12']));
});

test('按树顺序找到第一篇文档', () => {
  assert.equal(findFirstDocumentId(tree), '11');
  assert.equal(findFirstDocumentId([]), undefined);
});
