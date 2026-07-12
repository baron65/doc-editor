import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResponsiveDocumentTree } from './ResponsiveDocumentTree';

test('窄屏提供打开目录按钮，桌面保留固定文档树', () => {
  const html = renderToStaticMarkup(
    <ResponsiveDocumentTree
      nodes={[{ id: '1', parentId: '0', nodeType: 'DOCUMENT', title: '文档', sortOrder: 0 }]}
      onSelect={() => undefined}
    />,
  );
  assert.match(html, /打开文档目录/);
  assert.match(html, /data-desktop-document-tree="true"/);
  assert.match(html, /hidden[^"\n]*lg:block/);
});
