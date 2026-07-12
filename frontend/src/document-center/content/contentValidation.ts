import type { DocumentContent } from '../../types/documentCenter';

export interface ContentValidationResult {
  valid: boolean;
  blockIndex?: number;
  message?: string;
}

export function collectMermaidSources(content: DocumentContent): string[] {
  const sources: string[] = [];
  function visit(node: DocumentContent) {
    if (node.type === 'mermaid') {
      sources.push(typeof node.attrs?.source === 'string' ? node.attrs.source : '');
    }
    node.content?.forEach(visit);
  }
  visit(content);
  return sources;
}

export async function validateMermaidContent(
  content: DocumentContent,
  parse: (source: string) => Promise<unknown>,
): Promise<ContentValidationResult> {
  const sources = collectMermaidSources(content);
  for (let index = 0; index < sources.length; index += 1) {
    try {
      await parse(sources[index]);
    } catch (error) {
      return {
        valid: false,
        blockIndex: index,
        message: error instanceof Error ? error.message : 'Mermaid 语法错误',
      };
    }
  }
  return { valid: true };
}

export async function validateMermaidSyntax(content: DocumentContent) {
  const mermaidModule = await import('mermaid');
  return validateMermaidContent(content, (source) => mermaidModule.default.parse(source));
}
