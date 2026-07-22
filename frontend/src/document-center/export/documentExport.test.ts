import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMarkdownFileName,
  exportDocumentAsMarkdown,
} from './documentExport';
import type { PublishedDocumentDetail } from '../../types/documentCenter';

test('导出 Markdown 保留常用富文本、资源链接和 Mermaid 代码围栏', () => {
  const document = {
    documentId: '10',
    title: '导出文档',
    schemaVersion: 1,
    publishedRevision: '3',
    publicationVersion: '5',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '概览' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '重要', marks: [{ type: 'bold' }] },
            { type: 'text', text: '链接', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
            { type: 'text', text: '代码', marks: [{ type: 'code' }] },
          ],
        },
        {
          type: 'taskList',
          content: [{
            type: 'taskItem',
            attrs: { checked: true },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成验收' }] }],
          }],
        },
        {
          type: 'image',
          attrs: { assetId: '20', alt: '架构图', caption: '系统架构' },
        },
        {
          type: 'attachment',
          attrs: {
            assetId: '21',
            originalName: '方案.pdf',
          },
        },
        {
          type: 'mermaid',
          attrs: { source: 'flowchart LR\nA-->B' },
        },
      ],
    },
  } satisfies PublishedDocumentDetail;
  const markdown = exportDocumentAsMarkdown(document);

  assert.match(markdown, /^# 导出文档/);
  assert.match(markdown, /## 概览/);
  assert.match(markdown, /\*\*重要\*\*/);
  assert.match(markdown, /\[链接\]\(https:\/\/example\.com\)/);
  assert.match(markdown, /`代码`/);
  assert.match(markdown, /- \[x\] 完成验收/);
  assert.match(markdown, /!\[架构图\]\(\/api\/v1\/document-center\/documents\/10\/assets\/20\)/);
  assert.match(markdown, /> 系统架构/);
  assert.match(markdown, /\[方案\.pdf\]\(\/api\/v1\/document-center\/documents\/10\/assets\/21\)/);
  assert.match(markdown, /```mermaid\nflowchart LR\nA-->B\n```/);
});

test('普通表格导出为 Markdown pipe table', () => {
  const markdown = exportDocumentAsMarkdown(documentWithTable([
    {
      type: 'tableRow',
      content: [
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '组件' }] }] },
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '版本' }] }] },
      ],
    },
    {
      type: 'tableRow',
      content: [
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '@umijs/max' }] }] },
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '4.5.3' }] }] },
      ],
    },
  ]));

  assert.match(markdown, /\| 组件 \| 版本 \|/);
  assert.match(markdown, /\| --- \| --- \|/);
  assert.match(markdown, /\| @umijs\/max \| 4\.5\.3 \|/);
});

test('复杂表格导出为 HTML table 避免丢失合并单元格结构', () => {
  const markdown = exportDocumentAsMarkdown(documentWithTable([
    {
      type: 'tableRow',
      content: [
        {
          type: 'tableCell',
          attrs: { colspan: 2, rowspan: 2 },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '合并区域' }] }],
        },
      ],
    },
  ]));

  assert.match(markdown, /<table>/);
  assert.match(markdown, /<td colspan="2" rowspan="2">合并区域<\/td>/);
});

test('Markdown 下载文件名会清理系统非法字符', () => {
  assert.equal(buildMarkdownFileName('研发/测试:PRD*?<>|"'), '研发_测试_PRD.md');
  assert.equal(buildMarkdownFileName('   '), 'document.md');
});

test('编号标题导出为标题内置序号并保留续排起始值', () => {
  const document = {
    documentId: 'ordered-heading',
    title: '标题续排',
    schemaVersion: 1,
    publishedRevision: '1',
    publicationVersion: '1',
    content: {
      type: 'doc',
      content: [{
        type: 'orderedList',
        attrs: { start: 3 },
        content: [{
          type: 'listItem',
          content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '第三节' }] }],
        }],
      }],
    },
  } satisfies PublishedDocumentDetail;

  assert.match(exportDocumentAsMarkdown(document), /## 3\. 第三节/);
});

test('普通有序列表仍使用 Markdown 列表语法', () => {
  const document = {
    documentId: 'ordered-body',
    title: '正文列表',
    schemaVersion: 1,
    publishedRevision: '1',
    publicationVersion: '1',
    content: {
      type: 'doc',
      content: [{
        type: 'orderedList',
        attrs: { start: 2 },
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二项' }] }],
        }],
      }],
    },
  } satisfies PublishedDocumentDetail;

  assert.match(exportDocumentAsMarkdown(document), /2\. 第二项/);
});

function documentWithTable(rows: PublishedDocumentDetail['content']['content']): PublishedDocumentDetail {
  return {
    documentId: 'table-doc',
    title: '表格导出',
    schemaVersion: 1,
    publishedRevision: '1',
    publicationVersion: '1',
    content: {
      type: 'doc',
      content: [{ type: 'table', content: rows }],
    },
  };
}
