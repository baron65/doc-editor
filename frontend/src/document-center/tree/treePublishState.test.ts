import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublishStatePresentation } from './treePublishState';

test('maps all admin document publish states to distinct labels', () => {
  assert.deepEqual(getPublishStatePresentation('DRAFT'), {
    label: '草稿',
    className: 'bg-gray-100 text-gray-500',
  });
  assert.deepEqual(getPublishStatePresentation('PUBLISHED'), {
    label: '已发布',
    className: 'bg-green-50 text-green-700',
  });
  assert.deepEqual(getPublishStatePresentation('PUBLISHED_WITH_CHANGES'), {
    label: '待发布更新',
    className: 'bg-amber-50 text-amber-700',
  });
});
