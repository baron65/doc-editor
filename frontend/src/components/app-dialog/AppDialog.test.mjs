import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dialogSource = readFileSync(new URL('./AppDialog.tsx', import.meta.url), 'utf8');
const files = [
  '../../pages/admin/document-center/index.tsx',
  '../../document-center/editor/DocumentEditorShell.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

test('公共弹窗覆盖确认、输入、多行输入和危险操作', () => {
  assert.match(dialogSource, /role="dialog"/);
  assert.match(dialogSource, /aria-modal="true"/);
  assert.match(dialogSource, /createPortal/);
  assert.match(dialogSource, /multiline/);
  assert.match(dialogSource, /danger/);
  assert.match(dialogSource, /Escape/);
});

test('文档中心不再使用原生 prompt 和 confirm', () => {
  assert.doesNotMatch(files, /window\.(prompt|confirm)/);
  assert.match(files, /useAppDialog/);
});
