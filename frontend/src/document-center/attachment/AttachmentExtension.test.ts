import assert from 'node:assert/strict';
import test from 'node:test';
import { AttachmentExtension } from './AttachmentExtension';

test('附件是可拖拽的原子块节点，并以 attachment 名称序列化', () => {
  assert.equal(AttachmentExtension.name, 'attachment');
  assert.equal(AttachmentExtension.config.group, 'block');
  assert.equal(AttachmentExtension.config.atom, true);
  assert.equal(AttachmentExtension.config.draggable, true);
});
