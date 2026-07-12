import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentReader } from './DocumentReader';

test('Reader 将结构化表格渲染为可读 HTML 表格', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '10',
        title: '表格文档',
        content: {
          type: 'doc',
          content: [
            {
              type: 'table',
              content: [
                {
                  type: 'tableRow',
                  content: [
                    { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '名称' }] }] },
                    { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '类型' }] }] },
                  ],
                },
                {
                  type: 'tableRow',
                  content: [
                    { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
                    { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
                  ],
                },
              ],
            },
          ],
        },
      }}
    />,
  );
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>.*名称.*<\/th>/);
  assert.match(html, /<td[^>]*>.*A.*<\/td>/);
});

test('Reader 渲染带语义样式的提示块', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '11',
        title: '提示块',
        content: {
          type: 'doc',
          content: [
            {
              type: 'callout',
              attrs: { kind: 'warning' },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '请注意配置风险' }] }],
            },
          ],
        },
      }}
    />,
  );
  assert.match(html, /data-callout-kind="warning"/);
  assert.match(html, /请注意配置风险/);
});

test('Reader 展示发布时间、页内目录和前后篇导航', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '12',
        title: '导航文档',
        publishedAt: '2026-07-12T09:00:00+08:00',
        content: {
          type: 'doc',
          content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '使用说明' }] }],
        },
      }}
      previous={{ id: '11', title: '上一篇' }}
      next={{ id: '13', title: '下一篇' }}
    />,
  );
  assert.match(html, /最后发布/);
  assert.match(html, /href="#使用说明"/);
  assert.match(html, /href="\/document-center\/11"/);
  assert.match(html, /href="\/document-center\/13"/);
});

test('Reader renders highlighted code with language and copy action', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '13',
        title: '代码示例',
        content: {
          type: 'doc',
          content: [
            {
              type: 'codeBlock',
              attrs: { language: 'java' },
              content: [{ type: 'text', text: 'public class Demo {}' }],
            },
          ],
        },
      }}
    />,
  );
  assert.match(html, /data-code-language="java"/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, /复制/);
});

test('Reader does not render dangerous persisted link protocols', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '14',
        title: '安全链接',
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: '不要点击',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            }],
          }],
        },
      }}
    />,
  );
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /target="_blank"/);
});
