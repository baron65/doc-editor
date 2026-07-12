import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const treeSource = readFileSync(
  new URL('../tree/ResponsiveDocumentTree.tsx', import.meta.url),
  'utf8',
);
const readerSource = readFileSync(new URL('./DocumentReader.tsx', import.meta.url), 'utf8');
const codeBlockSource = readFileSync(new URL('./CodeBlock.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('阅读页只在宽屏常驻紧凑文档树', () => {
  assert.match(treeSource, /className="[^"\n]*hidden[^"\n]*w-52[^"\n]*shrink-0[^"\n]*lg:block[^"\n]*xl:w-56/);
  assert.match(treeSource, /sticky top-8[^"\n]*max-h-\[calc\(100vh-4rem\)\][^"\n]*overflow-y-auto/);
  assert.doesNotMatch(treeSource, /hidden w-72 shrink-0 lg:block/);
});

test('正文卡片在小屏使用紧凑内边距', () => {
  assert.match(readerSource, /p-5[^"\n]*sm:p-6 lg:p-8/);
});

test('本页目录过长时在视口内独立滚动', () => {
  assert.match(
    readerSource,
    /sticky top-(?:0|8)[^"\n]*max-h-\[calc\(100vh-4rem\)\][^"\n]*overflow-y-auto[^"\n]*xl:block/,
  );
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
