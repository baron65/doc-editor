import assert from 'node:assert/strict';
import test from 'node:test';
import { getCodeLineNumbers } from './codeLineNumbers.ts';

test('代码行号按逻辑行连续编号，并保留空行和末尾空行', () => {
  assert.deepEqual(getCodeLineNumbers('first\n\nthird\n'), [1, 2, 3, 4]);
});

test('空代码块仍显示第一行行号', () => {
  assert.deepEqual(getCodeLineNumbers(''), [1]);
});
