import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterCodeLanguages,
  findCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguages';

test('代码语言别名规范化为稳定值', () => {
  assert.equal(normalizeCodeLanguage('JS'), 'javascript');
  assert.equal(normalizeCodeLanguage(' shell '), 'bash');
  assert.equal(normalizeCodeLanguage(), 'plaintext');
});

test('语言搜索匹配名称、值和别名', () => {
  assert.deepEqual(filterCodeLanguages('py').map((item) => item.value), ['python']);
  assert.equal(findCodeLanguage('ts')?.label, 'TypeScript');
});

test('未知语言保留规范化后的原始值', () => {
  assert.equal(normalizeCodeLanguage('Kotlin'), 'kotlin');
  assert.equal(findCodeLanguage('kotlin'), undefined);
});
