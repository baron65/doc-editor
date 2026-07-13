import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync(new URL('../../config/config.ts', import.meta.url), 'utf8');
const userPage = readFileSync(new URL('../pages/document-center/index.tsx', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('../pages/admin/document-center/index.tsx', import.meta.url), 'utf8');

test('用户端和管理端分别只有一个页面入口', () => {
  assert.match(routes, /path: '\/document-center\/:documentId', component: '\.\/document-center\/index'/);
  assert.match(routes, /path: '\/admin\/document-center\/:documentId', component: '\.\/admin\/document-center\/index'/);
  assert.equal(existsSync(new URL('../pages/document-center/detail.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../pages/admin/document-center/detail.tsx', import.meta.url)), false);
});

test('用户端单页同时承担文档树、详情请求和正文阅读', () => {
  assert.match(userPage, /useParams/);
  assert.match(userPage, /getPublishedDocument/);
  assert.match(userPage, /<DocumentReader/);
  assert.match(userPage, /getDocumentNavigation/);
});

test('管理端单页同时承担完整树管理和文档编辑', () => {
  assert.match(adminPage, /getAdminDocument/);
  assert.match(adminPage, /<DocumentEditorShell/);
  assert.match(adminPage, /onDocumentChange=\{treeRequest\.refresh\}/);
  assert.match(adminPage, /handleCreateSubmit/);
  assert.match(adminPage, /handleRenameDirectory/);
  assert.match(adminPage, /handleMoveSelected/);
  assert.match(adminPage, /handleTreeDrop/);
});
