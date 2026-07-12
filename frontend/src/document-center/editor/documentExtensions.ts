import { Markdown } from '@tiptap/markdown';
import { MarkdownPasteExtension } from './MarkdownPasteExtension';
import { createDocumentSchemaExtensions } from './documentSchemaExtensions';

export function createDocumentExtensions() {
  return [
    ...createDocumentSchemaExtensions(),
    Markdown,
    MarkdownPasteExtension,
  ];
}
