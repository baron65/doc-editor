import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { mergeAttributes } from '@tiptap/core';
import { AttachmentExtension } from '../attachment/AttachmentExtension';
import { CalloutExtension } from '../callout/CalloutExtension';
import { MermaidExtension } from '../mermaid/MermaidExtension';
import { CodeBlockExtension } from '../code/CodeBlockExtension';

export function createDocumentSchemaExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
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
    }),
    Table.configure({
      resizable: true,
      handleWidth: 6,
      cellMinWidth: 80,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    AttachmentExtension,
    CalloutExtension,
    MermaidExtension,
    CodeBlockExtension,
  ];
}
