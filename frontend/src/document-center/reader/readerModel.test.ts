import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentContent, DocumentTreeNode } from '../../types/documentCenter';
import { buildReaderContent, getDocumentNavigation, selectActiveHeadingId } from './readerModel';

test('提取二三级标题并生成稳定且不重复的锚点', () => {
  const content: DocumentContent = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '快速开始' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '配置' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '快速开始' }] },
    ],
  };

  const result = buildReaderContent(content);

  assert.deepEqual(result.headings, [
    { id: '快速开始', level: 2, text: '快速开始' },
    { id: '配置', level: 3, text: '配置' },
    { id: '快速开始-2', level: 2, text: '快速开始' },
  ]);
  assert.equal(result.content.content?.[2].attrs?.readerId, '快速开始-2');
});

test('有序列表内的标题在目录中包含实际序号但锚点保持基于标题文本', () => {
  const content: DocumentContent = {
    type: 'doc',
    content: [{
      type: 'orderedList',
      attrs: { start: 3 },
      content: [
        {
          type: 'listItem',
          content: [{
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '背景' }],
          }],
        },
        {
          type: 'listItem',
          content: [{
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '目标' }],
          }],
        },
      ],
    }],
  };

  const result = buildReaderContent(content);

  assert.deepEqual(result.headings, [
    { id: '背景', level: 2, text: '3. 背景' },
    { id: '目标', level: 2, text: '4. 目标' },
  ]);
  assert.equal(
    result.content.content?.[0]?.content?.[0]?.content?.[0]?.attrs?.readerId,
    '背景',
  );
});

test('历史发布稿中的 Markdown 附件链接在 Reader 构建阶段转换为附件卡片节点', () => {
  const content: DocumentContent = {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [
        { type: 'text', text: '📎 ' },
        {
          type: 'text',
          text: 'MyBody_LessonPlan_V2.pdf',
          marks: [{ type: 'link', attrs: { href: 'https://example.com/MyBody_LessonPlan_V2.pdf' } }],
        },
      ],
    }],
  };

  const result = buildReaderContent(content);

  assert.equal(result.content.content?.[0].type, 'attachment');
  assert.equal(result.content.content?.[0].attrs?.originalName, 'MyBody_LessonPlan_V2.pdf');
  assert.equal(result.content.content?.[0].attrs?.href, 'https://example.com/MyBody_LessonPlan_V2.pdf');
});

test('按文档树深度优先顺序计算上一篇和下一篇', () => {
  const tree: DocumentTreeNode[] = [
    {
      id: '1', parentId: '0', nodeType: 'DIRECTORY', title: '目录', sortOrder: 0,
      children: [
        { id: '2', parentId: '1', nodeType: 'DOCUMENT', title: '第一篇', sortOrder: 0 },
        { id: '3', parentId: '1', nodeType: 'DOCUMENT', title: '第二篇', sortOrder: 1 },
      ],
    },
    { id: '4', parentId: '0', nodeType: 'DOCUMENT', title: '第三篇', sortOrder: 1 },
  ];

  assert.deepEqual(getDocumentNavigation(tree, '3'), {
    previous: { id: '2', title: '第一篇' },
    next: { id: '4', title: '第三篇' },
  });
  assert.deepEqual(getDocumentNavigation(tree, '2'), {
    previous: undefined,
    next: { id: '3', title: '第二篇' },
  });
});

test('selects the last heading that crossed the reading threshold', () => {
  const positions = [
    { id: 'intro', top: -300 },
    { id: 'setup', top: 90 },
    { id: 'deploy', top: 460 },
  ];
  assert.equal(selectActiveHeadingId(positions, 120), 'setup');
  assert.equal(selectActiveHeadingId(positions, -400), 'intro');
  assert.equal(selectActiveHeadingId([], 120), undefined);
});
