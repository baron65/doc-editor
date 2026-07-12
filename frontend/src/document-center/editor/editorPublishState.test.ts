import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublishActionPresentation } from './editorPublishState';

test('publish action follows the three-state lifecycle', () => {
  assert.deepEqual(getPublishActionPresentation('DRAFT'), { label: '发布', enabled: true });
  assert.deepEqual(getPublishActionPresentation('PUBLISHED'), { label: '已发布', enabled: false });
  assert.deepEqual(getPublishActionPresentation('PUBLISHED_WITH_CHANGES'), {
    label: '发布更新',
    enabled: true,
  });
});
