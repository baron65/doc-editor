import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const treeSource = readFileSync(
  new URL('../tree/ResponsiveDocumentTree.tsx', import.meta.url),
  'utf8',
);
const readerSource = readFileSync(new URL('./DocumentReader.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../../pages/document-center/index.tsx', import.meta.url), 'utf8');
const codeBlockSource = readFileSync(new URL('./CodeBlock.tsx', import.meta.url), 'utf8');
const mermaidSource = readFileSync(new URL('../mermaid/MermaidRenderer.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../editor/DocumentEditorShell.tsx', import.meta.url), 'utf8');
const calloutSource = readFileSync(new URL('../callout/CalloutExtension.ts', import.meta.url), 'utf8');
const schemaSource = readFileSync(new URL('../editor/documentSchemaExtensions.ts', import.meta.url), 'utf8');

test('阅读页只在宽屏常驻紧凑文档树', () => {
  assert.match(treeSource, /className="[^"\n]*hidden[^"\n]*w-52[^"\n]*shrink-0[^"\n]*lg:block[^"\n]*xl:w-56/);
  assert.match(treeSource, /sticky top-8[^"\n]*max-h-\[calc\(100vh-4rem\)\][^"\n]*overflow-y-auto/);
  assert.doesNotMatch(treeSource, /hidden w-72 shrink-0 lg:block/);
});

test('正文卡片在小屏使用紧凑内边距', () => {
  assert.match(readerSource, /p-5[^"\n]*sm:p-6 lg:p-8/);
});

test('用户端三栏固定在视口内且仅正文区域独立滚动', () => {
  assert.match(pageSource, /h-screen[^"\n]*overflow-hidden/);
  assert.match(pageSource, /h-full min-h-0 min-w-0 flex-1 overflow-hidden/);
  assert.match(pageSource, /<DocumentReader[\s\S]*?containedScroll/);
  assert.match(treeSource, /hidden h-full max-h-full[^"\n]*overflow-y-auto/);
});

test('本页目录过长时在视口内独立滚动', () => {
  assert.match(readerSource, /sticky top-0 hidden w-52[^"\n]*overflow-y-auto[^"\n]*xl:block/);
  assert.match(readerSource, /containedScroll \? 'max-h-full' : 'max-h-\[calc\(100vh-4rem\)\]'/);
  assert.match(readerSource, /containedScroll \? 'h-full overflow-y-auto overscroll-contain' : ''/);
});

test('文档异步加载后会重新定位初始 hash 锚点', () => {
  assert.match(pageSource, /location\.hash/);
  assert.match(pageSource, /requestAnimationFrame/);
  assert.match(pageSource, /getElementById/);
  assert.match(pageSource, /scrollIntoView/);
});

test('Mermaid SVG 内的文本不受正文段落样式影响', () => {
  assert.match(globalStyles, /\.mermaid-renderer \.nodeLabel p,[\s\S]*\.mermaid-renderer \.edgeLabel p\s*\{[^}]*margin:\s*0/);
  assert.match(globalStyles, /\.mermaid-renderer svg text\s*\{[^}]*fill:/);
});

test('Mermaid 阅读器关闭 HTML labels，避免 foreignObject 标签被清空', () => {
  assert.match(mermaidSource, /flowchart:\s*\{[\s\S]*htmlLabels:\s*false/);
});

test('富文本 mark 包装元素保留列表 key', () => {
  assert.match(readerSource, /return <strong key=\{key\}>\{current\}<\/strong>/);
  assert.match(readerSource, /return <em key=\{key\}>\{current\}<\/em>/);
  assert.match(readerSource, /return <u key=\{key\}>\{current\}<\/u>/);
  assert.match(readerSource, /return <code key=\{key\}>\{current\}<\/code>/);
});

test('编辑与阅读代码块统一使用微软 Visual Studio 深色主题', () => {
  assert.match(globalStyles, /@import 'highlight\.js\/styles\/vs2015\.css'/);
  assert.doesNotMatch(codeBlockSource, /highlight\.js\/styles\/vs2015\.css/);
  assert.doesNotMatch(codeBlockSource, /highlight\.js\/styles\/github-dark\.css/);
  assert.match(codeBlockSource, /bg-\[#1e1e1e\]/);
  assert.match(globalStyles, /background: #1e1e1e/);
  assert.match(globalStyles, /Consolas/);
  assert.match(globalStyles, /\.document-editor pre::before/);
  assert.match(globalStyles, /content: 'VS Code'/);
  assert.match(globalStyles, /padding-top: 3rem/);
});

test('编辑器和阅读器共享同一套正文视觉层', () => {
  assert.match(editorSource, /document-body document-editor/);
  assert.match(readerSource, /document-body document-content-body/);
  assert.doesNotMatch(readerSource, /document-content-body space-y-3/);
  assert.match(globalStyles, /\.document-body p/);
  assert.match(globalStyles, /\.document-body h1/);
  assert.match(globalStyles, /\.document-body table/);
  assert.match(globalStyles, /\.document-body img/);
  assert.match(globalStyles, /\.document-body code:not\(pre code\)/);
});

test('表格尊重自身宽度、超出时横向滚动且不使用圆角', () => {
  assert.match(globalStyles, /\.document-table-wrapper,[\s\S]*?overflow-x:\s*auto/);
  assert.match(globalStyles, /\.document-table-wrapper,[\s\S]*?border:\s*0/);
  assert.match(globalStyles, /\.document-table-wrapper,[\s\S]*?border-radius:\s*0/);
  assert.match(globalStyles, /\.document-body table\s*\{[^}]*width:\s*auto/);
  assert.match(globalStyles, /\.document-body table\s*\{[^}]*max-width:\s*none/);
  assert.doesNotMatch(globalStyles, /\.document-body img,\s*\.document-body table,/);
});

test('提示块和图片在编辑态复用阅读态视觉语义', () => {
  assert.match(calloutSource, /class: 'callout-node'/);
  assert.doesNotMatch(calloutSource, /border-blue-200 bg-blue-50/);
  assert.match(globalStyles, /\[data-callout-kind='warning'\]/);
  assert.match(globalStyles, /\[data-callout-kind='success'\]/);
  assert.match(globalStyles, /\[data-callout-kind='danger'\]/);
  assert.match(schemaSource, /class: 'document-image'/);
  assert.match(schemaSource, /figcaption/);
});

test('表格开启列宽拖动并提供清晰的编辑反馈', () => {
  assert.match(schemaSource, /resizable: true/);
  assert.match(schemaSource, /handleWidth: 6/);
  assert.match(schemaSource, /cellMinWidth: 80/);
  assert.match(schemaSource, /lastColumnResizable: true/);
  assert.match(schemaSource, /allowTableNodeSelection: true/);
  assert.match(globalStyles, /\.column-resize-handle/);
  assert.match(globalStyles, /\.resize-cursor/);
  assert.match(globalStyles, /\.selectedCell::after/);
});
