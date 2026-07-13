import { Markdown } from '@tiptap/markdown';
import { MarkdownPasteExtension } from './MarkdownPasteExtension';
import { createDocumentSchemaExtensions } from './documentSchemaExtensions';
import { BlockHighlightExtension } from './BlockHighlightExtension';
import { BlockFormattingExtension } from './BlockFormattingExtension';

export function createDocumentExtensions() {
  return [
    ...createDocumentSchemaExtensions(),
    BlockFormattingExtension,
    BlockHighlightExtension,
    Markdown,
    MarkdownPasteExtension,
  ];
}
