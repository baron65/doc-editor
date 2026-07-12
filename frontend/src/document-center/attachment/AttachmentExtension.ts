import { mergeAttributes, Node } from '@tiptap/core';

export interface AttachmentAttributes {
  assetId: string;
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
      originalName: { default: '' },
      mimeType: { default: 'application/octet-stream' },
      sizeBytes: { default: '0' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="attachment"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'attachment',
        class: 'attachment-node rounded-xl border border-gray-200 bg-gray-50 p-4',
      }),
      ['div', { class: 'font-medium text-gray-800' }, node.attrs.originalName],
      ['div', { class: 'mt-1 text-xs text-gray-500' }, `${node.attrs.mimeType} · ${formatFileSize(node.attrs.sizeBytes)}`],
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
