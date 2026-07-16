import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentExtensions } from './documentExtensions';

test('编辑器扩展名称唯一，避免 StarterKit v3 重复注册 Link 和 Underline', () => {
  const extensionNames = createDocumentExtensions().flatMap((extension) => {
    const extensions = 'extensions' in extension && Array.isArray(extension.extensions)
      ? extension.extensions
      : [extension];
    return extensions.map((item) => item.name);
  });
  const duplicates = extensionNames.filter((name, index) => extensionNames.indexOf(name) !== index);
  assert.deepEqual(duplicates, []);
});

test('编辑器只注册一个自定义代码块扩展', () => {
  const extensionNames = createDocumentExtensions().flatMap((extension) => {
    const extensions = 'extensions' in extension && Array.isArray(extension.extensions)
      ? extension.extensions
      : [extension];
    return extensions.map((item) => item.name);
  });
  assert.equal(extensionNames.filter((name) => name === 'codeBlock').length, 1);
});
