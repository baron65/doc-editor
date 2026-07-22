import Image from '@tiptap/extension-image';
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import { AttachmentExtension } from '../attachment/AttachmentExtension';
import { CalloutExtension } from '../callout/CalloutExtension';
import { MermaidExtension } from '../mermaid/MermaidExtension';
import { CodeBlockExtension } from '../code/CodeBlockExtension';
import { normalizeTextBackgroundColor } from '../content/blockFormatting';
import { ImageNodeView } from '../image/ImageNodeView';

const tableCellBackgroundAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => normalizeTextBackgroundColor(
    element.getAttribute('data-background-color') ?? element.style.backgroundColor,
  ),
  renderHTML: (attributes: Record<string, unknown>) => {
    const backgroundColor = normalizeTextBackgroundColor(attributes.backgroundColor);
    return backgroundColor
      ? { 'data-background-color': backgroundColor, style: `background-color: ${backgroundColor}` }
      : {};
  },
};

const DocumentTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: tableCellBackgroundAttribute,
    };
  },
});

const DocumentTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: tableCellBackgroundAttribute,
    };
  },
});

const DocumentListItem = ListItem.extend({
  content: '(paragraph|heading) block*',
});

export function createDocumentSchemaExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      listItem: false,
      heading: {
        levels: [1, 2, 3, 4, 5],
      },
      link: {
        autolink: true,
        openOnClick: false,
      },
    }),
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          assetId: { default: null },
          caption: { default: null },
        };
      },
      renderHTML({ HTMLAttributes, node }) {
        const { assetId, caption, ...imageAttributes } = HTMLAttributes;
        return [
          'figure',
          mergeAttributes({
            class: 'document-image',
            'data-type': 'image',
            'data-asset-id': assetId,
          }),
          ['img', mergeAttributes(this.options.HTMLAttributes, imageAttributes)],
          ...(node.attrs.caption ? [['figcaption', {}, String(node.attrs.caption)]] : []),
        ];
      },
      addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
      },
    }),
    Table.configure({
      resizable: true,
      handleWidth: 6,
      cellMinWidth: 80,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    }),
    TableRow,
    DocumentTableHeader,
    DocumentTableCell,
    DocumentListItem,
    TaskList,
    TaskItem.configure({ nested: true }),
    AttachmentExtension,
    CalloutExtension,
    MermaidExtension,
    CodeBlockExtension,
  ];
}
