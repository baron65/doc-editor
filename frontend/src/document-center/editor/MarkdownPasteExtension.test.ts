import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStrongMarkdown,
  normalizeMarkdownAttachments,
  parseMarkdownToDocument,
} from './MarkdownPasteExtension';

test('普通单行文本和单行列表标记不触发 Markdown 转换', () => {
  assert.equal(isStrongMarkdown('普通文本'), false);
  assert.equal(isStrongMarkdown('# 可能只是井号'), false);
  assert.equal(isStrongMarkdown('- 单独一行'), false);
});

test('附件 Markdown 链接转换为附件卡片节点', () => {
  const markdown = '📎 [MyBody_LessonPlan_V2.pdf](https://example.com/files/MyBody_LessonPlan_V2.pdf)';
  assert.equal(isStrongMarkdown(markdown), true);

  const result = parseMarkdownToDocument(markdown);

  assert.equal(result.content?.[0].type, 'attachment');
  assert.deepEqual(result.content?.[0].attrs, {
    assetId: null,
    href: 'https://example.com/files/MyBody_LessonPlan_V2.pdf',
    originalName: 'MyBody_LessonPlan_V2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: '0',
  });
});

test('历史上已保存为普通链接的 Markdown 附件在加载时也会归一化', () => {
  const result = normalizeMarkdownAttachments({
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [
        { type: 'text', text: '📎 ' },
        {
          type: 'text',
          text: 'MyBody_LessonPlan_V2.pdf',
          marks: [{ type: 'link', attrs: { href: '/api/files/MyBody_LessonPlan_V2.pdf' } }],
        },
      ],
    }],
  });

  assert.equal(result.content?.[0].type, 'attachment');
  assert.equal(result.content?.[0].attrs?.href, '/api/files/MyBody_LessonPlan_V2.pdf');
});

test('回形针位于链接文本内部时也转换为附件节点', () => {
  const result = parseMarkdownToDocument(
    '[📎 MyBody_LessonPlan_V2.pdf](https://example.com/files/MyBody_LessonPlan_V2.pdf)',
  );

  assert.equal(result.content?.[0].type, 'attachment');
  assert.equal(result.content?.[0].attrs?.originalName, 'MyBody_LessonPlan_V2.pdf');
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

test('mermaid 围栏语言前后有空白时也转换为流程图节点', () => {
  const result = parseMarkdownToDocument('``` mermaid \nflowchart LR\nA-->B\n```');
  assert.equal(result.content?.[0].type, 'mermaid');
  assert.equal(result.content?.[0].attrs?.source, 'flowchart LR\nA-->B');
});
