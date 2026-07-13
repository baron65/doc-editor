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

test('顶部新建固定在根节点且目录节点提供子节点新建入口', () => {
  assert.match(adminPageSource, /openCreatePanel\('DOCUMENT', '0'\)/);
  assert.match(adminPageSource, /openCreatePanel\('DIRECTORY', '0'\)/);
  assert.match(treeSource, /onCreateChild\?:/);
  assert.match(treeSource, /新建子文档/);
  assert.match(treeSource, /新建子目录/);
  assert.match(treeSource, /isDirectory && onCreateChild/);
});

test('文档树提供根目录拖拽投放区', () => {
  assert.match(treeSource, /getRootDropDestination/);
  assert.match(treeSource, /handleRootDrop/);
  assert.match(treeSource, /拖到此处移到根目录/);
});
