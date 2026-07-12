import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentContent } from '../../types/documentCenter';
import { collectMermaidSources, validateMermaidContent } from './contentValidation';

const content: DocumentContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
    { type: 'mermaid', attrs: { source: 'graph TD\nA-->B' } },
    { type: 'mermaid', attrs: { source: 'invalid' } },
  ],
};

test('按正文顺序提取 Mermaid 源码', () => {
  assert.deepEqual(collectMermaidSources(content), ['graph TD\nA-->B', 'invalid']);
});

test('返回首个 Mermaid 语法错误的块序号和原因', async () => {
  const result = await validateMermaidContent(content, async (source) => {
    if (source === 'invalid') {
      throw new Error('bad syntax');
    }
  });
  assert.deepEqual(result, { valid: false, blockIndex: 1, message: 'bad syntax' });
});

test('所有 Mermaid 块语法正确时通过', async () => {
  const result = await validateMermaidContent(content, async () => undefined);
  assert.deepEqual(result, { valid: true });
});
