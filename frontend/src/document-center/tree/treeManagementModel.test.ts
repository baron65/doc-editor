import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentTreeNode } from '../../types/documentCenter';
import { getDropDestination, getMoveTargetDirectories, getTargetAppendIndex } from './treeManagementModel';

const tree: DocumentTreeNode[] = [
  {
    id: '10',
    parentId: '0',
    nodeType: 'DIRECTORY',
    title: '指南',
    sortOrder: 0,
    children: [
      {
        id: '11',
        parentId: '10',
        nodeType: 'DIRECTORY',
        title: '子目录',
        sortOrder: 0,
        children: [
          { id: '101', parentId: '11', nodeType: 'DOCUMENT', title: '文档', sortOrder: 0 },
        ],
      },
    ],
  },
  { id: '20', parentId: '0', nodeType: 'DIRECTORY', title: '参考', sortOrder: 1 },
];

test('directory cannot be moved into itself or its descendants', () => {
  assert.deepEqual(
    getMoveTargetDirectories(tree, tree[0]).map((target) => target.id),
    ['0', '20'],
  );
});

test('document can move to root or any directory', () => {
  const document = tree[0].children?.[0].children?.[0];
  assert.deepEqual(
    getMoveTargetDirectories(tree, document).map((target) => target.id),
    ['0', '10', '11', '20'],
  );
});

test('append index excludes moving node when target parent is unchanged', () => {
  assert.equal(getTargetAppendIndex(tree, '0', tree[1]), 1);
  assert.equal(getTargetAppendIndex(tree, '10', tree[1]), 1);
});

test('drop on a directory appends inside it and rejects descendant cycles', () => {
  const document = tree[0].children?.[0].children?.[0];
  assert.deepEqual(getDropDestination(tree, document, tree[1]), {
    targetParentId: '20',
    targetIndex: 0,
  });
  assert.equal(getDropDestination(tree, tree[0], tree[0].children?.[0]), undefined);
});

test('drop on a document inserts before that document', () => {
  const document = tree[0].children?.[0].children?.[0];
  assert.deepEqual(getDropDestination(tree, tree[1], document), {
    targetParentId: '11',
    targetIndex: 0,
  });
});
