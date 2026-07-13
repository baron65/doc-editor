import type { DocumentContent } from '@/types/documentCenter';

export function isMermaidLanguage(language: unknown) {
  return typeof language === 'string' && language.trim().toLowerCase() === 'mermaid';
}

export function extractDocumentText(node: DocumentContent): string {
  if (typeof node.text === 'string') {
    return node.text;
  }
  return (node.content ?? []).map(extractDocumentText).join('');
}

export function normalizeMermaidCodeBlocks(node: DocumentContent): DocumentContent {
  if (node.type === 'codeBlock' && isMermaidLanguage(node.attrs?.language)) {
    return {
      type: 'mermaid',
      attrs: {
        source: extractDocumentText(node),
      },
    };
  }
  if (!node.content?.length) {
    return node;
  }
  return {
    ...node,
    content: node.content.map(normalizeMermaidCodeBlocks),
  };
}
