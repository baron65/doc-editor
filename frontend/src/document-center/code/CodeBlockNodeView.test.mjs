import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CodeBlockNodeView.tsx', import.meta.url), 'utf8');
const copySource = readFileSync(new URL('../copyText.ts', import.meta.url), 'utf8');

test('代码块节点提供语言搜索、换行和复制操作', () => {
  assert.match(source, /updateAttributes\(\{ language/);
  assert.match(source, /placeholder="搜索语言"/);
  assert.match(source, /自动换行/);
  assert.match(copySource, /navigator\.clipboard\?\.writeText/);
  assert.match(source, /contentEditable=\{false\}/);
  assert.match(source, /<NodeViewContent/);
  assert.match(source, /className="hljs code-block-editor-content/);
});

test('代码块语言菜单支持点击外部和 Escape 关闭', () => {
  assert.match(source, /addEventListener\('pointerdown'/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
});

test('代码块使用独立节点句柄并提供节点级操作', () => {
  assert.match(source, /className="code-block-node-side-handle"/);
  assert.match(source, /aria-label="代码块节点操作"/);
  assert.match(source, /复制代码块节点/);
  assert.match(source, /删除代码块节点/);
  assert.match(source, /copyCodeBlockNodeAsRichContent/);
  assert.match(source, /setNodeSelection\(position\)/);
});

test('代码块句柄仅在节点选中时显示', () => {
  assert.match(source, /selected \? \(\s*<div\s+className="code-block-node-side-handle"/);
  assert.match(source, /if \(!selected\) \{\s*setNodeToolbarOpen\(false\)/);
});
