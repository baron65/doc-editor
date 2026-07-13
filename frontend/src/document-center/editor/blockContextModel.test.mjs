import assert from 'node:assert/strict';
import test from 'node:test';
import { Schema } from '@tiptap/pm/model';
import {
  getBlockHandlePresentation,
  getBlockMenuSide,
  getDocumentBlockTextRange,
  resolveDocumentBlockTarget,
  resolveFormattableTextBlockTarget,
} from './blockContextModel.ts';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    heading: {
      group: 'block',
      content: 'text*',
      attrs: { level: { default: 1 } },
    },
    bulletList: { group: 'block', content: 'listItem+' },
    listItem: { content: 'paragraph block*' },
    taskList: { group: 'block', content: 'taskItem+' },
    taskItem: { content: 'paragraph block*', attrs: { checked: { default: false } } },
    text: { group: 'inline' },
  },
});

test('空段落显示加号入口', () => {
  assert.deepEqual(getBlockHandlePresentation('paragraph', true), { icon: '+', label: '添加内容' });
});

test('非空块显示当前块类型', () => {
  assert.deepEqual(getBlockHandlePresentation('paragraph', false), { icon: 'T', label: '正文' });
  assert.deepEqual(getBlockHandlePresentation('heading', false, { level: 2 }), { icon: 'H2', label: '二级标题' });
  assert.deepEqual(getBlockHandlePresentation('bulletList', false), { icon: '•', label: '无序列表' });
  assert.deepEqual(getBlockHandlePresentation('taskList', false), { icon: '☑', label: '任务清单' });
  assert.deepEqual(getBlockHandlePresentation('codeBlock', false), { icon: '{}', label: '代码块' });
  assert.deepEqual(getBlockHandlePresentation('table', false), { icon: '▦', label: '表格' });
});

test('任务清单中鼠标所在行解析为对应任务项', () => {
  const firstItem = schema.node('taskItem', { checked: false }, schema.node('paragraph', null, schema.text('第一项')));
  const secondItem = schema.node('taskItem', { checked: true }, schema.node('paragraph', null, schema.text('第二项')));
  const list = schema.node('taskList', null, [firstItem, secondItem]);
  const doc = schema.node('doc', null, list);
  const secondItemStart = 1 + firstItem.nodeSize;

  const target = resolveDocumentBlockTarget(doc, secondItemStart + 3);

  assert.equal(target?.pos, secondItemStart);
  assert.equal(target?.end, secondItemStart + secondItem.nodeSize);
  assert.equal(target?.presentationType, 'taskList');
});

test('标题手柄支持 H1 到 H5 的当前状态', () => {
  const expectedLabels = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题'];
  for (let level = 1; level <= 5; level += 1) {
    assert.deepEqual(
      getBlockHandlePresentation('heading', false, { level }),
      { icon: `H${level}`, label: expectedLabels[level - 1] },
    );
  }
});

test('将鼠标内容位置解析为对应顶层块的精确起止位置', () => {
  const first = schema.node('paragraph', null, schema.text('第一行'));
  const second = schema.node('heading', { level: 4 }, schema.text('第二行'));
  const doc = schema.node('doc', null, [first, second]);

  const firstTarget = resolveDocumentBlockTarget(doc, 2);
  assert.equal(firstTarget?.pos, 0);
  assert.equal(firstTarget?.end, first.nodeSize);
  assert.equal(firstTarget?.node.type.name, 'paragraph');

  const secondStart = first.nodeSize;
  const secondTarget = resolveDocumentBlockTarget(doc, secondStart + 2);
  assert.equal(secondTarget?.pos, secondStart);
  assert.equal(secondTarget?.end, secondStart + second.nodeSize);
  assert.equal(secondTarget?.node.type.name, 'heading');
  assert.equal(secondTarget?.node.attrs.level, 4);
});

test('列表中鼠标所在行解析为对应列表项而不是整个列表', () => {
  const firstItem = schema.node('listItem', null, schema.node('paragraph', null, schema.text('第一项')));
  const secondItem = schema.node('listItem', null, schema.node('paragraph', null, schema.text('第二项')));
  const list = schema.node('bulletList', null, [firstItem, secondItem]);
  const doc = schema.node('doc', null, list);
  const secondItemStart = 1 + firstItem.nodeSize;

  const target = resolveDocumentBlockTarget(doc, secondItemStart + 3);

  assert.equal(target?.pos, secondItemStart);
  assert.equal(target?.end, secondItemStart + secondItem.nodeSize);
  assert.equal(target?.presentationType, 'bulletList');
  assert.equal(target?.insertionPos, secondItemStart + secondItem.nodeSize - 1);
  assert.deepEqual(getDocumentBlockTextRange(target), {
    from: secondItemStart + 2,
    to: secondItemStart + secondItem.nodeSize - 2,
  });
  const textBlock = resolveFormattableTextBlockTarget(target);
  assert.equal(textBlock?.pos, secondItemStart + 1);
  assert.equal(textBlock?.node.type.name, 'paragraph');
  assert.equal(textBlock?.node.textContent, '第二项');
});

test('普通段落自身就是可设置缩进和对齐的文本块', () => {
  const paragraph = schema.node('paragraph', null, schema.text('正文'));
  const doc = schema.node('doc', null, paragraph);
  const target = resolveDocumentBlockTarget(doc, 2);

  const textBlock = resolveFormattableTextBlockTarget(target);

  assert.equal(textBlock?.pos, 0);
  assert.equal(textBlock?.node, paragraph);
});

test('段落文本范围不包含节点边界', () => {
  const paragraph = schema.node('paragraph', null, schema.text('正文'));
  const doc = schema.node('doc', null, paragraph);
  const target = resolveDocumentBlockTarget(doc, 2);
  assert.deepEqual(getDocumentBlockTextRange(target), { from: 1, to: paragraph.nodeSize - 1 });
});

test('气泡优先显示在句柄左侧且空间不足时回退右侧', () => {
  assert.equal(getBlockMenuSide(400, 1200, 240), 'left');
  assert.equal(getBlockMenuSide(180, 760, 240), 'right');
});
