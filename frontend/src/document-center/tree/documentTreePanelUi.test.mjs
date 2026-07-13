import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const treeSource = readFileSync(new URL('./DocumentTreePanel.tsx', import.meta.url), 'utf8');
const adminPageSource = readFileSync(new URL('../../pages/admin/document-center/index.tsx', import.meta.url), 'utf8');

test('草稿文档在树节点上提供删除入口且已发布文档不显示', () => {
  assert.match(treeSource, /onDeleteDraft\?:/);
  assert.match(treeSource, /node\.publishState === 'DRAFT'/);
  assert.match(treeSource, /删除草稿/);
  assert.match(adminPageSource, /handleDeleteDraft/);
  assert.match(adminPageSource, /确认永久删除草稿/);
  assert.match(adminPageSource, /await deleteNode/);
});
