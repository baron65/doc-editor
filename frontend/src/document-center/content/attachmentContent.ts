import type { DocumentContent } from '../../types/documentCenter';
import { inferAttachmentMimeType, isSafeAttachmentHref } from '../attachment/attachmentLink';

export function normalizeMarkdownAttachments(node: DocumentContent): DocumentContent {
  if (node.type === 'paragraph') {
    return parseMarkdownAttachmentParagraph(node) ?? node;
  }
  return node.content
    ? { ...node, content: node.content.map(normalizeMarkdownAttachments) }
    : node;
}

function parseMarkdownAttachmentParagraph(node: DocumentContent): DocumentContent | undefined {
  const content = node.content ?? [];
  const plainText = content.map((child) => child.text ?? '').join('').trim();
  if (!plainText.startsWith('📎')) return undefined;

  const linkedNodes = content.filter((child) => child.marks?.some((mark) => mark.type === 'link'));
  if (!linkedNodes.length) return undefined;
  const href = linkedNodes[0].marks?.find((mark) => mark.type === 'link')?.attrs?.href;
  if (!isSafeAttachmentHref(href)) return undefined;
  if (linkedNodes.some((child) => child.marks?.find((mark) => mark.type === 'link')?.attrs?.href !== href)) {
    return undefined;
  }

  const linkedText = linkedNodes.map((child) => child.text ?? '').join('').trim();
  const originalName = linkedText.replace(/^📎\s*/, '').trim();
  if (!originalName) return undefined;
  const nonLinkText = content
    .filter((child) => !child.marks?.some((mark) => mark.type === 'link'))
    .map((child) => child.text ?? '')
    .join('')
    .trim();
  if (nonLinkText && nonLinkText !== '📎') return undefined;

  return {
    type: 'attachment',
    attrs: {
      assetId: null,
      href: href.trim(),
      originalName,
      mimeType: inferAttachmentMimeType(originalName),
      sizeBytes: '0',
    },
  };
}
