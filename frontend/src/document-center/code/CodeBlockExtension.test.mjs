import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CodeBlockExtension.ts', import.meta.url), 'utf8');

test('编辑态代码块使用 lowlight 在可编辑内容中实时高亮', () => {
  assert.match(source, /@tiptap\/extension-code-block-lowlight/);
  assert.match(source, /createLowlight/);
  assert.match(source, /lowlight\.register/);
  assert.match(source, /ReactNodeViewRenderer\(CodeBlockNodeView/);
  assert.match(source, /\.configure\(\{[\s\S]*lowlight/);
});

test('光标位于代码块内部时也激活代码块独立句柄', () => {
  assert.match(
    source,
    /ReactNodeViewRenderer\(CodeBlockNodeView,\s*\{\s*selectedOnTextSelection:\s*true,?\s*\}\)/,
  );
});
