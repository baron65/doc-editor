import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CodeBlockNodeView.tsx', import.meta.url), 'utf8');

test('代码块节点提供语言搜索、换行和复制操作', () => {
  assert.match(source, /updateAttributes\(\{ language/);
  assert.match(source, /placeholder="搜索语言"/);
  assert.match(source, /自动换行/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /contentEditable=\{false\}/);
  assert.match(source, /<NodeViewContent/);
  assert.match(source, /className="hljs code-block-editor-content/);
});

test('代码块语言菜单支持点击外部和 Escape 关闭', () => {
  assert.match(source, /addEventListener\('pointerdown'/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
});
