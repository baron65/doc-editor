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
const globalCssSource = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

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

test('块工具箱提供 H1 到 H5 标题级别', () => {
  assert.match(blockToolbarSource, /\[1, 2, 3, 4, 5\]/);
  assert.match(blockToolbarSource, /label=\{`H\$\{level\}`\}/);
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
  assert.match(blockToolbarSource, /from: target\.pos, to: target\.end/);
});

test('块菜单补齐任务清单、字号、下划线和删除线工具', () => {
  assert.match(blockToolbarSource, /toggleTaskList/);
  assert.match(blockToolbarSource, /fontSize/);
  assert.match(blockToolbarSource, /toggleUnderline/);
  assert.match(blockToolbarSource, /toggleStrike/);
});
