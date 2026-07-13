import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { AttachmentExtension } from '../attachment/AttachmentExtension';
import { CalloutExtension } from '../callout/CalloutExtension';
import { MermaidExtension } from '../mermaid/MermaidExtension';

export function createDocumentSchemaExtensions() {
  return [
    StarterKit.configure({
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
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    AttachmentExtension,
    CalloutExtension,
    MermaidExtension,
  ];
}
