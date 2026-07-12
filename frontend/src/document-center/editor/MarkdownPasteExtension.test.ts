import assert from 'node:assert/strict';
import test from 'node:test';
import { isStrongMarkdown, parseMarkdownToDocument } from './MarkdownPasteExtension';

test('普通单行文本和单行列表标记不触发 Markdown 转换', () => {
  assert.equal(isStrongMarkdown('普通文本'), false);
  assert.equal(isStrongMarkdown('# 可能只是井号'), false);
  assert.equal(isStrongMarkdown('- 单独一行'), false);
});

test('标题组合、两级列表、围栏和表格属于强 Markdown', () => {
  assert.equal(isStrongMarkdown('# 标题\n\n正文'), true);
  assert.equal(isStrongMarkdown('- 一级\n  - 二级'), true);
  assert.equal(isStrongMarkdown('```java\nclass Demo {}\n```'), true);
  assert.equal(isStrongMarkdown('| 名称 | 类型 |\n| --- | --- |\n| A | B |'), true);
});

test('基础 Markdown 转换为受控 Tiptap JSON', () => {
  const result = parseMarkdownToDocument('# 标题\n\n正文包含 **加粗** 和 [链接](https://example.com)。');
  assert.equal(result.type, 'doc');
  assert.equal(result.content?.[0].type, 'heading');
  assert.equal(result.content?.[1].type, 'paragraph');
  const paragraphText = result.content?.[1].content ?? [];
  assert.equal(paragraphText.some((node) => node.marks?.some((mark) => mark.type === 'bold')), true);
  assert.equal(paragraphText.some((node) => node.marks?.some((mark) => mark.type === 'link')), true);
});

test('mermaid 围栏和 Markdown 表格转换为对应结构化节点', () => {
  const result = parseMarkdownToDocument(
    '```mermaid\ngraph TD\nA-->B\n```\n\n| 名称 | 类型 |\n| --- | --- |\n| A | B |',
  );
  assert.equal(result.content?.[0].type, 'mermaid');
  assert.equal(result.content?.[0].attrs?.source, 'graph TD\nA-->B');
  assert.equal(result.content?.[1].type, 'table');
});
