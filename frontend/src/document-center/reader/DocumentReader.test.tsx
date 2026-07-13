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

test('Reader 在弹框容器内约束正文和目录滚动高度', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      containedScroll
      document={{
        documentId: '12',
        title: '弹框预览',
        content: {
          type: 'doc',
          content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '长目录' }] }],
        },
      }}
    />,
  );
  assert.match(html, /h-full overflow-hidden/);
  assert.match(html, /h-full overflow-y-auto overscroll-contain/);
  assert.match(html, /max-h-full/);
});

test('Reader 按语义渲染 H1 到 H5 标题', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '15',
        title: '多级标题',
        content: {
          type: 'doc',
          content: [1, 2, 3, 4, 5].map((level) => ({
            type: 'heading',
            attrs: { level },
            content: [{ type: 'text', text: `标题 ${level}` }],
          })),
        },
      }}
    />,
  );

  for (let level = 1; level <= 5; level += 1) {
    assert.match(html, new RegExp(`<h${level}[^>]*>.*标题 ${level}.*</h${level}>`));
  }
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

test('Reader 将历史 Mermaid 代码块按流程图渲染', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '17',
        title: '历史流程图',
        content: {
          type: 'doc',
          content: [
            {
              type: 'codeBlock',
              attrs: { language: 'mermaid' },
              content: [{ type: 'text', text: 'flowchart LR\nA-->B' }],
            },
          ],
        },
      }}
    />,
  );
  assert.match(html, /Mermaid 渲染中/);
  assert.doesNotMatch(html, /data-code-language="mermaid"/);
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

test('Reader 只渲染安全的对齐缩进和文本颜色', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '16',
        title: '格式文档',
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            attrs: { textAlign: 'center', indent: 2 },
            content: [{
              type: 'text',
              text: '安全颜色',
              marks: [{ type: 'textStyle', attrs: { color: '#2563eb' } }],
            }],
          }],
        },
      }}
    />,
  );
  assert.match(html, /text-align:center/);
  assert.match(html, /margin-left:48px/);
  assert.match(html, /color:#2563eb/);
});
