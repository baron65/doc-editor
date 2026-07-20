import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const nodeViewSource = readFileSync(new URL('./ImageNodeView.tsx', import.meta.url), 'utf8');
const actionSource = readFileSync(new URL('./ImageNodeAction.ts', import.meta.url), 'utf8');
const schemaSource = readFileSync(new URL('../editor/documentSchemaExtensions.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../editor/DocumentEditorShell.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('图片节点使用独立 NodeView 和专用句柄', () => {
  assert.match(schemaSource, /ReactNodeViewRenderer\(ImageNodeView\)/);
  assert.match(nodeViewSource, /className="image-node-side-handle"/);
  assert.match(nodeViewSource, /aria-label="图片节点操作"/);
  assert.match(nodeViewSource, /替换图片/);
  assert.match(nodeViewSource, /替代文本/);
  assert.match(nodeViewSource, /图片说明/);
  assert.match(nodeViewSource, /复制图片节点/);
  assert.match(nodeViewSource, /删除图片节点/);
});

test('图片句柄仅在节点选中时显示', () => {
  assert.match(nodeViewSource, /selected \? \(\s*<div\s+className="image-node-side-handle"/);
  assert.match(nodeViewSource, /if \(!selected\) \{\s*setToolbarOpen\(false\)/);
});

test('图片节点操作通过编辑器统一处理替换和元信息编辑', () => {
  assert.match(actionSource, /document-center:image-node-action/);
  assert.match(nodeViewSource, /dispatchEvent\(new CustomEvent\(IMAGE_NODE_ACTION_EVENT/);
  assert.match(editorSource, /addEventListener\(IMAGE_NODE_ACTION_EVENT/);
  assert.match(editorSource, /detail\.action === 'replace'/);
  assert.match(editorSource, /detail\.action === 'alt'/);
  assert.match(editorSource, /detail\.action === 'caption'/);
});

test('图片和代码块专用句柄拥有独立样式', () => {
  assert.match(globalStyles, /\.document-editor \.image-node-side-handle/);
  assert.match(globalStyles, /\.document-editor \.image-node-toolbar/);
  assert.match(globalStyles, /\.document-editor \.code-block-node-side-handle/);
  assert.match(globalStyles, /\.document-editor \.code-block-node-toolbar/);
});
