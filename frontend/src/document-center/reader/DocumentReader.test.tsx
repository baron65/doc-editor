import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentReader, type ReaderDocument } from './DocumentReader';

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

test('Reader 按编辑器 colwidth 渲染列宽、表格宽度及合并单元格', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: 'table-widths',
        title: '列宽文档',
        content: {
          type: 'doc',
          content: [{
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', attrs: { colspan: 2, colwidth: [152, 80] }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '前两列' }] }] },
                  { type: 'tableHeader', attrs: { colwidth: [591] }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '第三列' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', attrs: { colspan: 2, rowspan: 2 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '合并区域' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容' }] }] },
                ],
              },
            ],
          }],
        },
      }}
    />,
  );

  assert.match(html, /<table style="width:823px"/);
  assert.match(html, /<col style="width:152px"/);
  assert.match(html, /<col style="width:80px"/);
  assert.match(html, /<col style="width:591px"/);
  assert.match(html, /<th colspan="2"/);
  assert.match(html, /<td colspan="2" rowspan="2"/);
});

test('Reader 将单元格背景色渲染到单元格本身', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: 'cell-background',
        title: '单元格背景',
        content: {
          type: 'doc',
          content: [{
            type: 'table',
            content: [{
              type: 'tableRow',
              content: [{
                type: 'tableCell',
                attrs: { backgroundColor: '#fff2cc' },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容' }] }],
              }],
            }],
          }],
        },
      }}
    />,
  );

  assert.match(html, /<td style="background-color:#fff2cc"/);
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

test('Reader 仅在用户端阅读页按需展示导出操作', () => {
  const baseDocument: ReaderDocument = {
    documentId: 'exportable',
    title: '可导出文档',
    publishedAt: '2026-07-12T09:00:00+08:00',
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '正文' }] }],
    },
  };

  const defaultHtml = renderToStaticMarkup(<DocumentReader document={baseDocument} />);
  const exportHtml = renderToStaticMarkup(<DocumentReader document={baseDocument} showExportActions />);

  assert.doesNotMatch(defaultHtml, /导出 Markdown/);
  assert.match(exportHtml, /document-reader-export-actions/);
  assert.match(exportHtml, /aria-label="导出文档"/);
  assert.match(exportHtml, /aria-expanded="false"/);
  assert.match(exportHtml, /document-reader-export-menu/);
  assert.match(exportHtml, /导出 Markdown/);
  assert.match(exportHtml, /导出 PDF/);
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

test('Reader 只渲染安全字号', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '18',
        title: '字号文档',
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: '安全字号',
              marks: [{ type: 'textStyle', attrs: { fontSize: '18px' } }],
            }, {
              type: 'text',
              text: '危险字号',
              marks: [{ type: 'textStyle', attrs: { fontSize: 'calc(100vw)' } }],
            }],
          }],
        },
      }}
    />,
  );
  assert.match(html, /font-size:18px/);
  assert.doesNotMatch(html, /calc\(100vw\)/);
});

test('Reader 渲染安全文本背景色并忽略非法值', () => {
  const html = renderToStaticMarkup(
    <DocumentReader
      document={{
        documentId: '19',
        title: '背景色文档',
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: '高亮文本',
              marks: [{ type: 'textStyle', attrs: { backgroundColor: '#fff2cc' } }],
            }, {
              type: 'text',
              text: '非法背景',
              marks: [{ type: 'textStyle', attrs: { backgroundColor: 'url(javascript:alert(1))' } }],
            }],
          }],
        },
      }}
    />,
  );
  assert.match(html, /background-color:#fff2cc/);
  assert.doesNotMatch(html, /javascript:alert/);
});
