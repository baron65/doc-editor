import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const extensionSource = readFileSync(new URL('./AttachmentExtension.ts', import.meta.url), 'utf8');
const readerSource = readFileSync(new URL('../reader/DocumentReader.tsx', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../editor/DocumentEditorShell.tsx', import.meta.url), 'utf8');
const toolbarSource = readFileSync(new URL('../editor/BlockContextToolbar.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('附件在编辑态和阅读态复用紧凑卡片样式', () => {
  assert.match(extensionSource, /class: 'attachment-card'/);
  assert.match(readerSource, /className="attachment-card"/);
  assert.match(globalStyles, /\.attachment-card\s*\{[^}]*width:\s*22\.5rem/s);
  assert.match(globalStyles, /\.attachment-card\s*\{[^}]*max-width:\s*100%/s);
});

test('附件卡片展示文件图标、名称和元信息', () => {
  assert.match(extensionSource, /attachment-card__icon/);
  assert.match(extensionSource, /attachment-card__name/);
  assert.match(extensionSource, /attachment-card__meta/);
  assert.match(readerSource, /attachment-card__download/);
});

test('管理端附件悬停时提供顶部下载和删除操作条', () => {
  assert.match(toolbarSource, /data-attachment-toolbar="true"/);
  assert.match(toolbarSource, /aria-label="下载附件"/);
  assert.match(toolbarSource, /aria-label="删除附件"/);
  assert.match(toolbarSource, /target\.type !== 'attachment'/);
  assert.match(editorSource, /getAttachmentDownloadUrl/);
  assert.match(editorSource, /buildAssetUrl\(document\.documentId, assetId, 'admin'\)/);
});

test('删除附件后选区停留在删除位置附近，不恢复到旧的文末选区', () => {
  assert.match(toolbarSource, /Selection\.near\(transaction\.doc\.resolve\(cursorPosition\), 1\)/);
  assert.match(toolbarSource, /transaction\.setMeta\(blockHighlightPluginKey, null\)/);
  assert.match(toolbarSource, /setTarget\(undefined\)/);
  assert.match(toolbarSource, /aria-label="删除附件"[\s\S]*onMouseDown=\{\(event\) => event\.preventDefault\(\)\}/);
});
