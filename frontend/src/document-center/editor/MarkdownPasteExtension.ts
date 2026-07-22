import { Extension } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { Plugin } from '@tiptap/pm/state';
import type { DocumentContent } from '../../types/documentCenter';
import { createDocumentSchemaExtensions } from './documentSchemaExtensions';
import { normalizeMermaidCodeBlocks } from '../content/mermaidContent';
import { normalizeMarkdownAttachments } from '../content/attachmentContent';

export { normalizeMarkdownAttachments } from '../content/attachmentContent';

const FENCED_BLOCK = /^```[^\n]*\n[\s\S]+?\n```/m;
const NESTED_LIST = /^(?:\s*[-*+] |\s*\d+\. ).+\n\s{2,}(?:[-*+] |\d+\. )/m;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/m;
const HEADING_WITH_OTHER_BLOCK = /^#{1,6}\s+.+\n(?:\s*\n)?\S/m;
const ATTACHMENT_MARKDOWN = /^\s*(?:📎\s*\[[^\]]+\]|\[📎\s*[^\]]+\])\([^)]+\)\s*$/;

let markdownManager: MarkdownManager | undefined;

export function isStrongMarkdown(text: string) {
  if (ATTACHMENT_MARKDOWN.test(text)) {
    return true;
  }
  if (!text.includes('\n')) {
    return false;
  }
  return FENCED_BLOCK.test(text)
    || NESTED_LIST.test(text)
    || TABLE_SEPARATOR.test(text)
    || HEADING_WITH_OTHER_BLOCK.test(text);
}

export function parseMarkdownToDocument(markdown: string): DocumentContent {
  markdownManager ??= new MarkdownManager({ extensions: createDocumentSchemaExtensions() });
  return normalizeMarkdownAttachments(
    normalizeMermaidCodeBlocks(markdownManager.parse(markdown) as DocumentContent),
  );
}

export const MarkdownPasteExtension = Extension.create({
  name: 'documentMarkdownPaste',
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) {
              return false;
            }
            const text = clipboard.getData('text/plain');
            if (!isStrongMarkdown(text)) {
              return false;
            }
            try {
              const parsed = parseMarkdownToDocument(text);
              event.preventDefault();
              return editor.commands.insertContent(parsed.content ?? []);
            } catch (_error) {
              return false;
            }
          },
        },
      }),
    ];
  },
});
