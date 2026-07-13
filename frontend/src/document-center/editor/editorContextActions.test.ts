import assert from 'node:assert/strict';
import test from 'node:test';
import { CALLOUT_KIND_OPTIONS, getContextualActionLabels } from './editorContextActions';

test('exposes all designed callout kinds', () => {
  assert.deepEqual(CALLOUT_KIND_OPTIONS.map((option) => option.value), [
    'info',
    'warning',
    'success',
    'danger',
  ]);
});

test('shows complete table and image editing actions for the current selection', () => {
  assert.deepEqual(getContextualActionLabels({ table: true, image: true }), [
    '删除表格',
    '替换图片',
    '替代文本',
    '图片说明',
  ]);
});
