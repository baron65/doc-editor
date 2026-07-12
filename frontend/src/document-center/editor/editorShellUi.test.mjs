import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const editorSource = readFileSync(new URL('./DocumentEditorShell.tsx', import.meta.url), 'utf8');
const detailPageSource = readFileSync(
  new URL('../../pages/admin/document-center/detail.tsx', import.meta.url),
  'utf8',
);
const adminIndexSource = readFileSync(
  new URL('../../pages/admin/document-center/index.tsx', import.meta.url),
  'utf8',
);

test('用户视角预览使用可见的视口弹层', () => {
  assert.match(editorSource, /role="dialog"/);
  assert.match(editorSource, /fixed inset-0 z-50/);
  assert.match(editorSource, /globalThis\.document\.body\.style\.overflow = 'hidden'/);
  assert.match(editorSource, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(editorSource, /sticky top-0 z-10 mb-4/);
});

test('编辑状态变化后通知详情页刷新文档树', () => {
  assert.match(editorSource, /onDocumentChange\?: \(\) => unknown \| Promise<unknown>/);
  assert.match(detailPageSource, /onDocumentChange=\{treeRequest\.refresh\}/);
});

test('不展示内部 revision 调试信息', () => {
  assert.doesNotMatch(editorSource, />draftRevision:/);
  assert.doesNotMatch(editorSource, />publishedRevision:/);
  assert.doesNotMatch(editorSource, />publicationVersion:/);
});

test('管理端左侧文档栏固定在视口并独立滚动', () => {
  const sidebarPattern = /sticky top-0 h-screen w-80[^"\n]*overflow-y-auto/;
  assert.match(detailPageSource, sidebarPattern);
  assert.match(adminIndexSource, sidebarPattern);
});

test('发布操作栏滚动时保持在可视范围', () => {
  assert.match(editorSource, /sticky top-0 z-20[^"\n]*bg-white[^"\n]*shadow-sm/);
  assert.match(detailPageSource, /<section className="min-w-0 flex-1">/);
  assert.match(editorSource, /mx-4 mt-4[^"\n]*rounded-t-xl[^"\n]*bg-white[^"\n]*sm:mx-6[^"\n]*lg:mx-8/);
});
