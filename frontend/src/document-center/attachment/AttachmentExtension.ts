import { mergeAttributes, Node } from '@tiptap/core';

export interface AttachmentAttributes {
  assetId?: string;
  href?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (attributes: AttachmentAttributes) => ReturnType;
    };
  }
}

export const AttachmentExtension = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      assetId: { default: null },
      href: { default: '' },
      originalName: { default: '' },
      mimeType: { default: 'application/octet-stream' },
      sizeBytes: { default: '0' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="attachment"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const fileBadge = getFileBadge(node.attrs.originalName, node.attrs.mimeType);
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'attachment',
        'data-href': node.attrs.href || undefined,
        class: 'attachment-card',
      }),
      ['div', { class: 'attachment-card__icon', 'aria-hidden': 'true' }, fileBadge],
      [
        'div',
        { class: 'attachment-card__content' },
        ['div', { class: 'attachment-card__name' }, node.attrs.originalName],
        ['div', { class: 'attachment-card__meta' }, buildAttachmentMeta(node.attrs.mimeType, node.attrs.sizeBytes)],
      ],
    ];
  },

  addCommands() {
    return {
      setAttachment:
        (attributes: AttachmentAttributes) =>
        ({ commands }) => commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },
});

function formatFileSize(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Math.max(0, bytes || 0)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAttachmentMeta(mimeType: string, sizeBytes: string) {
  return Number(sizeBytes) > 0 ? `${mimeType} · ${formatFileSize(sizeBytes)}` : mimeType;
}

function getFileBadge(originalName: string, mimeType: string) {
  const extension = originalName.split('.').pop()?.trim();
  if (extension && extension !== originalName && extension.length <= 5) {
    return extension.toUpperCase();
  }
  const mimeSubtype = mimeType.split('/').pop()?.split(/[.+-]/)[0];
  return (mimeSubtype || 'FILE').slice(0, 5).toUpperCase();
}
