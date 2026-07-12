import assert from 'node:assert/strict';
import test from 'node:test';
import { CalloutExtension } from './CalloutExtension';

test('提示块是包含正文的 block 节点', () => {
  assert.equal(CalloutExtension.name, 'callout');
  assert.equal(CalloutExtension.config.group, 'block');
  assert.equal(CalloutExtension.config.content, 'block+');
});
