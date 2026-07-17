import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const extensionSource = readFileSync(new URL('./MermaidExtension.ts', import.meta.url), 'utf8');
const nodeViewSource = readFileSync(new URL('./MermaidNodeView.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('Mermaid 节点在编辑态使用可编辑源码视图', () => {
  assert.match(extensionSource, /ReactNodeViewRenderer\(MermaidNodeView\)/);
  assert.match(nodeViewSource, /<textarea/);
  assert.match(nodeViewSource, /value=\{source\}/);
  assert.match(nodeViewSource, /updateAttributes\(\{ source: event\.target\.value \}\)/);
  assert.match(nodeViewSource, /aria-label="Mermaid 源码"/);
  assert.match(globalStyles, /\.document-editor \.mermaid-source-editor/);
});

test('Mermaid 节点使用独立句柄和轻量操作气泡', () => {
  assert.match(nodeViewSource, /className="mermaid-node-side-handle"/);
  assert.match(nodeViewSource, /className="mermaid-node-handle-button"/);
  assert.match(nodeViewSource, /className="mermaid-node-toolbar"/);
  assert.match(nodeViewSource, /aria-label="复制 Mermaid 节点"/);
  assert.match(nodeViewSource, /aria-label="删除 Mermaid 节点"/);
  assert.match(nodeViewSource, /copyMermaidNodeAsRichContent/);
  assert.match(nodeViewSource, /DOMSerializer\.fromSchema\(schema\)\.serializeNode\(node\)/);
  assert.match(nodeViewSource, /deleteNode\(\)/);
  assert.match(globalStyles, /\.document-editor \.mermaid-node-side-handle/);
  assert.match(globalStyles, /\.document-editor \.mermaid-node-toolbar/);
});
