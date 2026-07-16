import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const editorSource = readFileSync(new URL('./DocumentEditorShell.tsx', import.meta.url), 'utf8');
const adminPageSource = readFileSync(
  new URL('../../pages/admin/document-center/index.tsx', import.meta.url),
  'utf8',
);
const blockToolbarSource = readFileSync(new URL('./BlockContextToolbar.tsx', import.meta.url), 'utf8');
const blockHighlightSource = readFileSync(new URL('./BlockHighlightExtension.ts', import.meta.url), 'utf8');
const documentExtensionsSource = readFileSync(new URL('./documentExtensions.ts', import.meta.url), 'utf8');
const documentSchemaExtensionsSource = readFileSync(new URL('./documentSchemaExtensions.ts', import.meta.url), 'utf8');
const globalCssSource = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');
const tablePickerSource = readFileSync(new URL('./TableSizePicker.tsx', import.meta.url), 'utf8');

test('用户视角预览使用可见的视口弹层', () => {
  assert.match(editorSource, /role="dialog"/);
  assert.match(editorSource, /fixed inset-0 z-50/);
  assert.match(editorSource, /globalThis\.document\.body\.style\.overflow = 'hidden'/);
  assert.match(editorSource, /min-h-0 flex-1 overflow-hidden/);
  assert.match(editorSource, /containedScroll/);
  assert.doesNotMatch(editorSource, /sticky top-0 z-10 mb-4/);
});

test('编辑状态变化后通知管理工作台刷新文档树', () => {
  assert.match(editorSource, /onDocumentChange\?: \(\) => unknown \| Promise<unknown>/);
  assert.match(adminPageSource, /onDocumentChange=\{treeRequest\.refresh\}/);
});

test('不展示内部 revision 调试信息', () => {
  assert.doesNotMatch(editorSource, />draftRevision:/);
  assert.doesNotMatch(editorSource, />publishedRevision:/);
  assert.doesNotMatch(editorSource, />publicationVersion:/);
  assert.doesNotMatch(adminPageSource, /treeRevision \{typedTree\?\.treeRevision/);
});

test('管理端不展示开发调试入口和手动保存按钮', () => {
  assert.doesNotMatch(editorSource, /立即保存/);
  assert.doesNotMatch(editorSource, /查看当前 Tiptap JSON/);
  assert.doesNotMatch(editorSource, /JSON\.stringify\(content/);
  assert.match(editorSource, /自动保存失败/);
});

test('插入代码块直接创建纯文本节点并由节点内选择语言', () => {
  assert.match(editorSource, /setCodeBlock\(\{ language: 'plaintext' \}\)/);
  assert.doesNotMatch(editorSource, /title: '插入代码块'/);
  assert.match(documentSchemaExtensionsSource, /codeBlock: false/);
  assert.match(documentSchemaExtensionsSource, /CodeBlockExtension/);
});

test('文档内容在 React 生命周期结束后挂载自定义节点视图', () => {
  assert.match(editorSource, /requestAnimationFrame\(\(\) => \{/);
  assert.match(editorSource, /cancelAnimationFrame/);
});

test('管理端左侧文档栏固定在视口并独立滚动', () => {
  const sidebarPattern = /sticky top-0 h-screen w-80[^"\n]*overflow-y-auto/;
  assert.match(adminPageSource, sidebarPattern);
});

test('发布操作栏滚动时保持在可视范围', () => {
  assert.match(editorSource, /sticky top-0 z-20[^"\n]*bg-white[^"\n]*shadow-sm/);
  assert.match(adminPageSource, /<section className="min-w-0 flex-1">/);
  assert.match(editorSource, /mx-4 mt-4[^"\n]*rounded-t-xl[^"\n]*bg-white[^"\n]*sm:mx-6[^"\n]*lg:mx-8/);
});

test('保存和发布失败原因在顶部操作栏内持续显示', () => {
  assert.match(editorSource, /role="alert"/);
  assert.match(editorSource, /aria-live="assertive"/);
  assert.match(editorSource, /errorMessage/);
  assert.match(editorSource, /草稿保存失败：/);
  assert.match(editorSource, /发布失败：/);
});

test('编辑器使用块级工具箱替代顶部内容工具栏', () => {
  assert.match(editorSource, /<BlockContextToolbar/);
  assert.doesNotMatch(editorSource, /<ToolbarButton/);
  assert.match(blockToolbarSource, /data-block-context-editor="true"/);
  assert.match(blockToolbarSource, /editor\.on\('selectionUpdate'/);
  assert.match(blockToolbarSource, /aria-label="块工具箱"/);
});

test('块手柄按鼠标坐标命中当前块并使用单列工具箱', () => {
  assert.match(blockToolbarSource, /posAtCoords\(/);
  assert.match(blockToolbarSource, /target\.insertionPos/);
  assert.match(blockToolbarSource, /flex flex-col/);
  assert.doesNotMatch(blockToolbarSource, /grid grid-cols-3/);
});

test('块工具箱只展示 H1 到 H3，H4/H5 保留快捷键入口', () => {
  assert.match(blockToolbarSource, /\[1, 2, 3\]/);
  assert.doesNotMatch(blockToolbarSource, /\[1, 2, 3, 4, 5\]/);
  assert.match(blockToolbarSource, /label=\{`H\$\{level\}`\}/);
  assert.match(blockToolbarSource, /heading4/);
  assert.match(blockToolbarSource, /heading5/);
});

test('常用块类型采用飞书式横向紧凑工具区', () => {
  assert.match(blockToolbarSource, /grid grid-cols-5/);
  assert.match(blockToolbarSource, /compact/);
  assert.match(blockToolbarSource, /icon="T"/);
  assert.match(blockToolbarSource, /type="code"/);
});

test('块菜单展示并执行编辑器范围内的快捷键', () => {
  assert.match(blockToolbarSource, /formatBlockShortcut/);
  assert.match(blockToolbarSource, /matchesBlockShortcut/);
  assert.match(blockToolbarSource, /addEventListener\('keydown'/);
  assert.match(blockToolbarSource, /shortcut=/);
  assert.match(blockToolbarSource, /role="tooltip"/);
  assert.match(blockToolbarSource, /\{label\} · \{shortcut\}/);
});

test('选中文本工具栏使用图标并提供文本和背景色工具', () => {
  assert.match(blockToolbarSource, /InlineToolIcon/);
  assert.match(blockToolbarSource, /type="bold"/);
  assert.match(blockToolbarSource, /type="italic"/);
  assert.match(blockToolbarSource, /type="strike"/);
  assert.match(blockToolbarSource, /type="underline"/);
  assert.match(blockToolbarSource, /type="link"/);
  assert.match(blockToolbarSource, /type="text-color"/);
  assert.match(blockToolbarSource, /type="background-color"/);
  assert.match(blockToolbarSource, /SAFE_TEXT_BACKGROUND_COLORS/);
  assert.match(blockToolbarSource, /selectionFormatMenu/);
});

test('鼠标进入手柄时临时高亮目标节点', () => {
  assert.match(blockToolbarSource, /blockHighlightPluginKey/);
  assert.match(blockHighlightSource, /Decoration\.node/);
  assert.match(documentExtensionsSource, /BlockHighlightExtension/);
  assert.match(globalCssSource, /\.block-handle-highlighted/);
});

test('气泡采用窄宽度并优先向正文外侧展开', () => {
  assert.match(blockToolbarSource, /w-60/);
  assert.match(blockToolbarSource, /getBlockMenuSide/);
  assert.match(blockToolbarSource, /right-9/);
  assert.match(blockToolbarSource, /left-9/);
});

test('列表引用代码使用语义图标并提供 hover 级联格式菜单', () => {
  assert.match(blockToolbarSource, /BlockToolIcon/);
  assert.match(blockToolbarSource, /BlockHandleIcon/);
  assert.match(blockToolbarSource, /bulletList: 'bullet-list'/);
  assert.match(blockToolbarSource, /bulletList/);
  assert.match(blockToolbarSource, /orderedList/);
  assert.match(blockToolbarSource, /blockquote/);
  assert.match(blockToolbarSource, /cascadeMenu/);
  assert.match(blockToolbarSource, /onMouseOver/);
  assert.match(blockToolbarSource, /position: 'fixed'/);
  assert.doesNotMatch(blockToolbarSource, /menuView !== 'main'/);
  assert.doesNotMatch(blockToolbarSource, />←</);
});

test('块菜单支持复制和删除精确节点', () => {
  assert.match(blockToolbarSource, /copyTargetNode/);
  assert.match(blockToolbarSource, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(blockToolbarSource, /insertContentAt\(target\.end, target\.node\.toJSON\(\)\)/);
  assert.match(blockToolbarSource, /deleteTargetNode/);
  assert.match(blockToolbarSource, /target\.node\.toJSON\(\)/);
  assert.match(blockToolbarSource, /\.delete\(target\.pos, target\.end\)/);
});

test('块菜单补齐任务清单、字号、下划线和删除线工具', () => {
  assert.match(blockToolbarSource, /toggleTaskList/);
  assert.match(blockToolbarSource, /fontSize/);
  assert.match(blockToolbarSource, /toggleUnderline/);
  assert.match(blockToolbarSource, /toggleStrike/);
});

test('表格入口使用尺寸选择器且块菜单不再提供行列增删', () => {
  assert.match(blockToolbarSource, /TableSizePicker/);
  assert.match(blockToolbarSource, /insertTable\(\{ rows, cols: columns, withHeaderRow: true \}\)/);
  assert.match(tablePickerSource, /表格尺寸选择/);
  for (const label of ['插入列', '删除列', '插入行', '删除行']) {
    assert.doesNotMatch(blockToolbarSource, new RegExp(`label="${label}"`));
  }
});

test('点击表格块句柄时建立整表节点选择', () => {
  assert.match(blockToolbarSource, /target\?\.type === 'table'/);
  assert.match(blockToolbarSource, /setNodeSelection\(target\.pos\)/);
  assert.match(documentExtensionsSource, /TableKeyboardExtension/);
});
