import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const treeSource = readFileSync(new URL('./DocumentTreePanel.tsx', import.meta.url), 'utf8');
const adminPageSource = readFileSync(new URL('../../pages/admin/document-center/index.tsx', import.meta.url), 'utf8');

test('树节点通过更多菜单承载重命名与删除操作', () => {
  assert.match(treeSource, /onRenameNode\?:/);
  assert.match(treeSource, /onDeleteNode\?:/);
  assert.match(treeSource, /更多操作/);
  assert.match(treeSource, /重命名/);
  assert.match(treeSource, /node\.publishState === 'DRAFT'/);
  assert.match(treeSource, /删除节点/);
  assert.match(adminPageSource, /handleRenameNode/);
  assert.match(adminPageSource, /重命名文档/);
  assert.match(adminPageSource, /await saveDraft/);
  assert.match(adminPageSource, /确认永久删除草稿/);
  assert.match(adminPageSource, /await deleteNode/);
});
