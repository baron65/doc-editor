import { Markdown } from '@tiptap/markdown';
import { MarkdownPasteExtension } from './MarkdownPasteExtension';
import { createDocumentSchemaExtensions } from './documentSchemaExtensions';
import { BlockHighlightExtension } from './BlockHighlightExtension';
import { BlockFormattingExtension } from './BlockFormattingExtension';
import { TableKeyboardExtension } from './TableKeyboardExtension';

export function createDocumentExtensions() {
  return [
    ...createDocumentSchemaExtensions(),
    BlockFormattingExtension,
    BlockHighlightExtension,
    TableKeyboardExtension,
    Markdown,
    MarkdownPasteExtension,
  ];
}
