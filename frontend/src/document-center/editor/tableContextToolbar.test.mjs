import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const toolbarSource = readFileSync(new URL('./TableContextToolbar.tsx', import.meta.url), 'utf8');
const keyboardSource = readFileSync(new URL('./TableKeyboardExtension.ts', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('./DocumentEditorShell.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('表格专用工具条采用飞书式图标操作而不是旧的文字分组菜单', () => {
  assert.doesNotMatch(toolbarSource, /MENU_GROUPS|table-context-trigger/);
  assert.match(toolbarSource, /aria-label="表格操作工具栏"/);
  assert.match(toolbarSource, /className=\{`table-tool-button/);
  for (const command of [
    'addRowBefore', 'addRowAfter', 'deleteRow',
    'addColumnBefore', 'addColumnAfter', 'deleteColumn',
    'mergeCells', 'splitCell', 'toggleHeaderRow', 'deleteTable',
  ]) {
    assert.match(toolbarSource, new RegExp(`\\.${command}\\(`));
  }
});

test('选中整行或整列后，图标工具栏可批量应用常用文本格式', () => {
  for (const command of [
    'toggleBold()', 'toggleItalic()', 'toggleStrike()', 'toggleUnderline()',
    'setTextColor(value)', 'setTextBackgroundColor(value)',
  ]) {
    assert.match(toolbarSource, new RegExp(command.replace(/[()]/g, '\\$&')));
  }
  for (const label of ['加粗', '斜体', '删除线', '下划线', '行内代码', '文字颜色', '单元格背景']) {
    assert.match(toolbarSource, new RegExp(`aria-label="${label}"`));
  }
  assert.match(toolbarSource, /data-tooltip/);
  assert.match(toolbarSource, /createPortal\(/);
  assert.match(toolbarSource, /role="tooltip"/);
  assert.match(globalStyles, /\.table-tool-tooltip\s*\{/);
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

test('表格工具条和颜色级联面板有独立视觉层', () => {
  assert.match(globalStyles, /\.table-context-toolbar/);
  assert.match(globalStyles, /\.table-format-popover/);
  assert.match(globalStyles, /\.table-tool-button/);
});

test('表格边缘采用连续轨道选择行列，并在任意边界显示插入控件', () => {
  assert.match(toolbarSource, /selectTableRow/);
  assert.match(toolbarSource, /selectTableColumn/);
  assert.match(toolbarSource, /table-row-rail/);
  assert.match(toolbarSource, /table-column-rail/);
  assert.match(toolbarSource, /table-row-rail-segment/);
  assert.match(toolbarSource, /table-column-rail-segment/);
  assert.match(toolbarSource, /table-row-boundary-insert/);
  assert.match(toolbarSource, /table-column-boundary-insert/);
  assert.match(globalStyles, /\.table-row-boundary-insert:hover/);
  assert.match(globalStyles, /\.table-column-boundary-insert:hover/);
  assert.match(globalStyles, /\.table-insert-line/);
});

test('表头、合并和删除操作根据表格选区显示为图标按钮', () => {
  assert.match(toolbarSource, /aria-label="设置为标题行"/);
  assert.match(toolbarSource, /aria-label="合并单元格"/);
  assert.match(toolbarSource, /aria-label="拆分单元格"/);
  assert.match(toolbarSource, /aria-label=\{deleteActionLabel\}/);
  assert.match(globalStyles, /\.document-body th/);
  assert.match(globalStyles, /background:\s*#f2f3f5/);
});

test('普通单元格光标不显示工具栏，单元格区域、整行、整列和整表选中时显示', () => {
  assert.match(toolbarSource, /const showToolbar = rowActive \|\| columnActive \|\| cellRangeActive \|\| tableActive/);
  assert.match(toolbarSource, /\{showToolbar \? <div/);
  assert.match(toolbarSource, /disabled=\{!rowActive && !tableActive\}/);
});

test('Mod-a 选中当前表格单元格后可通过工具栏拆分合并单元格', () => {
  assert.match(keyboardSource, /'Mod-a':\s*\(\)\s*=>\s*selectCurrentTableCell/);
  assert.match(keyboardSource, /CellSelection\.create\(state\.doc, cellPos\)/);
  assert.match(toolbarSource, /const cellRangeActive = context\.selectionKind === 'cells'/);
  assert.match(toolbarSource, /aria-label="拆分单元格"/);
  assert.match(toolbarSource, /editor\.chain\(\)\.focus\(\)\.splitCell\(\)\.run\(\)/);
});

test('行列轨道内容居中并压缩单行高度', () => {
  assert.match(globalStyles, /\.table-column-rail-segment,[\s\S]*?display:\s*grid/);
  assert.match(globalStyles, /place-items:\s*center/);
  assert.match(globalStyles, /\.document-body th > p,[\s\S]*?margin:\s*0/);
  assert.match(globalStyles, /\.document-body th > p,[\s\S]*?min-height:\s*1\.5em/);
  assert.match(globalStyles, /padding:\s*0\.375rem 0\.625rem/);
  assert.match(globalStyles, /\.table-row-rail,[\s\S]*?margin-top:\s*0 !important/);
});

test('导轨使用半宽样式，仅移除选择段中央圆点并保留边界圆点', () => {
  assert.doesNotMatch(toolbarSource, /<span aria-hidden>•<\/span>/);
  assert.match(globalStyles, /\.table-column-rail \{[\s\S]*?height:\s*0\.5625rem/);
  assert.match(globalStyles, /\.table-row-rail \{[\s\S]*?width:\s*0\.5625rem/);
  assert.match(globalStyles, /\.table-row-boundary-insert::before/);
  assert.match(globalStyles, /\.selectedCell::after[\s\S]*?background:\s*rgb\(51 112 255 \/ 12%\)/);
  assert.doesNotMatch(globalStyles, /\.selectedCell::after[\s\S]{0,180}box-shadow/);
});

test('列宽拖拽命中区不改变布局，悬停时仅高亮内部细线并显示左右拖拽光标', () => {
  assert.match(globalStyles, /\.document-editor \.tableWrapper \{[\s\S]*?overflow-y:\s*hidden/);
  assert.match(globalStyles, /\.document-editor \.column-resize-handle \{[\s\S]*?bottom:\s*0;[\s\S]*?width:\s*6px;[\s\S]*?background:\s*transparent/);
  assert.match(globalStyles, /\.document-editor \.column-resize-handle::after \{[\s\S]*?width:\s*2px/);
  assert.match(globalStyles, /\.document-editor\.ProseMirror\.resize-cursor \.column-resize-handle::after[\s\S]*?background:\s*#3370ff/);
  assert.match(globalStyles, /\.document-editor\.ProseMirror\.resize-cursor[\s\S]*?cursor:\s*col-resize !important/);
});
