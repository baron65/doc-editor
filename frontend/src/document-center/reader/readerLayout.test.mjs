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
const copyTextSource = readFileSync(new URL('../copyText.ts', import.meta.url), 'utf8');
const codeBlockNodeViewSource = readFileSync(new URL('../code/CodeBlockNodeView.tsx', import.meta.url), 'utf8');
const mermaidSource = readFileSync(new URL('../mermaid/MermaidRenderer.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../editor/DocumentEditorShell.tsx', import.meta.url), 'utf8');
const calloutSource = readFileSync(new URL('../callout/CalloutExtension.ts', import.meta.url), 'utf8');
const schemaSource = readFileSync(new URL('../editor/documentSchemaExtensions.ts', import.meta.url), 'utf8');

test('阅读页只在宽屏常驻紧凑文档树', () => {
  assert.match(treeSource, /className="[^"\n]*hidden[^"\n]*w-52[^"\n]*shrink-0[^"\n]*lg:block[^"\n]*xl:w-56/);
  assert.match(treeSource, /hidden h-full max-h-full[^"\n]*overflow-y-auto/);
  assert.doesNotMatch(treeSource, /hidden w-72 shrink-0 lg:block/);
});

test('正文卡片在小屏使用紧凑内边距', () => {
  assert.match(readerSource, /p-5[^"\n]*sm:p-6 lg:p-8/);
});

test('用户端三栏固定在视口内且仅正文区域独立滚动', () => {
  assert.match(pageSource, /h-screen[^"\n]*overflow-hidden/);
  assert.match(pageSource, /h-full min-h-0 min-w-0 flex-1 overflow-hidden/);
  assert.match(pageSource, /<DocumentReader[\s\S]*?containedScroll/);
  assert.match(pageSource, /<DocumentReader[\s\S]*?showExportActions/);
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

test('代码块复制兼容非安全上下文并显示失败反馈', () => {
  assert.match(copyTextSource, /navigator\.clipboard\?\.writeText/);
  assert.match(copyTextSource, /document\.execCommand\('copy'\)/);
  assert.match(codeBlockSource, /复制失败/);
  assert.match(copyTextSource, /clipboardData\?\.setData\('text\/plain'/);
});

test('编辑端与阅读端代码块均展示不参与复制的逻辑行号', () => {
  assert.match(codeBlockSource, /getCodeLineNumbers/);
  assert.match(codeBlockNodeViewSource, /getCodeLineNumbers/);
  assert.match(codeBlockSource, /code-line-numbers/);
  assert.match(codeBlockSource, /list-none/);
  assert.match(codeBlockNodeViewSource, /code-line-numbers/);
  assert.match(codeBlockNodeViewSource, /list-none/);
  assert.match(globalStyles, /\.document-body ol\.code-line-numbers\s*\{[^}]*list-style:\s*none/);
  assert.match(globalStyles, /\.document-body ol\.code-line-numbers\s*\{[^}]*padding-left:\s*0\.75rem/);
  assert.match(globalStyles, /\.document-body ol\.code-line-numbers\s*\{[^}]*min-width:\s*3rem/);
  assert.match(globalStyles, /\.document-body ol\.code-line-numbers li\s*\{[^}]*line-height:\s*1\.5rem/);
  assert.match(globalStyles, /\.document-body pre code\.hljs\s*\{[^}]*padding:\s*0/);
  assert.match(globalStyles, /\.document-body pre code\.hljs\s*\{[^}]*line-height:\s*1\.5rem/);
  assert.match(globalStyles, /\.document-body pre\.code-block-editor-content\s*\{[^}]*line-height:\s*1\.5rem/);
  assert.match(globalStyles, /\.document-body ol\.code-line-numbers li::marker\s*\{[^}]*content:\s*''/);
  assert.match(codeBlockSource, /aria-hidden/);
  assert.match(codeBlockNodeViewSource, /aria-hidden/);
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

test('用户端导出操作和导航目录在打印 PDF 时隐藏', () => {
  assert.match(readerSource, /document-reader-layout/);
  assert.match(readerSource, /document-reader-export-actions/);
  assert.match(readerSource, /document-reader-export-menu/);
  assert.match(readerSource, /aria-label="导出文档"/);
  assert.match(readerSource, /aria-expanded=\{exportMenuOpen\}/);
  assert.doesNotMatch(readerSource, /group-hover:visible|group-hover:opacity-100/);
  assert.match(readerSource, /document-reader-navigation/);
  assert.match(readerSource, /data-document-reader-toc="true"/);
  assert.match(treeSource, /data-desktop-document-tree="true"/);
  assert.match(treeSource, /data-mobile-document-tree="true"/);
  assert.match(globalStyles, /@media print/);
  assert.match(globalStyles, /\.document-reader-export-actions,[\s\S]*?\.document-reader-navigation\s*\{[\s\S]*?display:\s*none !important/);
  assert.match(globalStyles, /\[data-document-reader-toc='true'\]/);
  assert.match(globalStyles, /background:\s*#ffffff !important/);
});

test('PDF 打印态解除滚动容器裁切并尽量保留阅读视觉', () => {
  assert.match(globalStyles, /@page\s*\{[\s\S]*?margin:\s*14mm/);
  assert.match(globalStyles, /\.document-reader-layout\s*\{[\s\S]*?display:\s*block !important/);
  assert.match(globalStyles, /\.document-reader-layout\s*\{[\s\S]*?overflow:\s*visible !important/);
  assert.match(globalStyles, /\.document-content\s*\{[\s\S]*?width:\s*100% !important/);
  assert.match(globalStyles, /\.document-body\s*\{[\s\S]*?font-size:\s*12pt/);
  assert.match(globalStyles, /print-color-adjust:\s*exact/);
  assert.match(globalStyles, /\.document-body pre\s*\{[\s\S]*?white-space:\s*pre-wrap/);
  assert.match(globalStyles, /\.document-body table\s*\{[\s\S]*?page-break-inside:\s*avoid/);
});

test('PDF 打印态将 Mermaid 流程图完整缩放到单页内', () => {
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.mermaid-renderer\s*\{[^}]*overflow:\s*visible !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.mermaid-renderer svg\s*\{[^}]*max-height:\s*220mm !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.mermaid-renderer svg\s*\{[^}]*width:\s*auto !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.mermaid-renderer svg\s*\{[^}]*margin:\s*0 auto !important/);
});

test('PDF 打印态允许长代码块自然跨页，避免整块前置留白', () => {
  assert.match(codeBlockSource, /code-block-renderer/);
  assert.match(codeBlockSource, /code-block-body/);
  assert.doesNotMatch(globalStyles, /\.document-table-wrapper,\s*\.document-body pre,/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer\s*\{[^}]*break-inside:\s*auto/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer > \.code-block-body\s*\{[^}]*display:\s*block !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer pre\s*\{[^}]*break-inside:\s*auto !important/);
});

test('PDF 打印态代码块各层使用一致圆角，内部背景不会露出尖角', () => {
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer\s*\{[^}]*border-radius:\s*0\.5rem !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer > header\s*\{[^}]*border-radius:\s*0\.5rem 0\.5rem 0 0 !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer > \.code-block-body\s*\{[^}]*border-radius:\s*0 0 0\.5rem 0\.5rem !important/);
  assert.match(globalStyles, /@media print\s*\{[\s\S]*?\.code-block-renderer pre\s*\{[^}]*border-radius:\s*0 0 0\.5rem 0\.5rem !important/);
});
