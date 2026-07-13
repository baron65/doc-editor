import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const toolbarSource = readFileSync(new URL('./TableContextToolbar.tsx', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('./DocumentEditorShell.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('表格专用工具条保留完整行列、单元格和整表操作', () => {
  for (const label of ['行', '列', '单元格', '表格']) {
    assert.match(toolbarSource, new RegExp(`label: '${label}'`));
  }
  for (const command of [
    'addRowBefore', 'addRowAfter', 'deleteRow',
    'addColumnBefore', 'addColumnAfter', 'deleteColumn',
    'mergeCells', 'splitCell', 'toggleHeaderRow', 'deleteTable',
  ]) {
    assert.match(toolbarSource, new RegExp(`\\.${command}\\(`));
  }
});

test('工具条随表格选区和页面滚动更新且不会使用原始确认框', () => {
  assert.match(toolbarSource, /selectionUpdate/);
  assert.match(toolbarSource, /transaction/);
  assert.match(toolbarSource, /addEventListener\('scroll',[^\n]+true\)/);
  assert.match(toolbarSource, /onConfirmDeleteTable/);
  assert.doesNotMatch(toolbarSource, /window\.confirm|window\.prompt/);
});

test('管理端挂载工具条并使用公共确认弹框删除整表', () => {
  assert.match(shellSource, /<TableContextToolbar/);
  assert.match(shellSource, /title: '删除表格'/);
  assert.match(shellSource, /danger: true/);
});

test('表格工具条和级联菜单有独立视觉层', () => {
  assert.match(globalStyles, /\.table-context-toolbar/);
  assert.match(globalStyles, /\.table-context-submenu/);
});

test('表格边缘提供明确的行列选择和指定位置插入控件', () => {
  assert.match(toolbarSource, /selectTableRow/);
  assert.match(toolbarSource, /selectTableColumn/);
  assert.match(toolbarSource, /table-row-handle/);
  assert.match(toolbarSource, /table-column-handle/);
  assert.match(toolbarSource, /table-row-insert-handle/);
  assert.match(toolbarSource, /table-column-insert-handle/);
  assert.match(toolbarSource, /table-row-delete-handle/);
  assert.match(toolbarSource, /table-column-delete-handle/);
  assert.match(toolbarSource, /删除第.*行/);
  assert.match(toolbarSource, /删除第.*列/);
});
