import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOrderedListSequences } from './orderedListContent.ts';

test('混合标题和正文的有序列表按语义拆分并分别编号', () => {
  const content = normalizeOrderedListSequences({
    type: 'doc',
    content: [{
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        listItem('heading', '一级标题一', 1),
        listItem('heading', '一级标题二', 1),
        listItem('paragraph', '独立正文一'),
        listItem('paragraph', '独立正文二'),
        listItem('heading', '二级标题一', 2),
        listItem('heading', '一级标题三', 1),
      ],
    }],
  });

  assert.deepEqual(
    content.content?.map((node) => ({
      start: node.attrs?.start,
      children: node.content?.map((item) => item.content?.[0]?.type),
    })),
    [
      { start: 1, children: ['heading', 'heading'] },
      { start: 1, children: ['paragraph', 'paragraph'] },
      { start: 1, children: ['heading'] },
      { start: 3, children: ['heading'] },
    ],
  );
});

test('已有的纯标题序列保留原始序号', () => {
  const content = normalizeOrderedListSequences({
    type: 'doc',
    content: [{
      type: 'orderedList',
      attrs: { start: 6 },
      content: [
        listItem('heading', '一级标题六', 1),
        listItem('heading', '一级标题七', 1),
      ],
    }],
  });

  assert.equal(content.content?.length, 1);
  assert.equal(content.content?.[0]?.attrs?.start, 6);
});

function listItem(type, text, level) {
  return {
    type: 'listItem',
    content: [{
      type,
      ...(level ? { attrs: { level } } : {}),
      content: [{ type: 'text', text }],
    }],
  };
}
