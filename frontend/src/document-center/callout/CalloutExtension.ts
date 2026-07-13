import { mergeAttributes, Node } from '@tiptap/core';

export type CalloutKind = 'info' | 'warning' | 'success' | 'danger';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind?: CalloutKind) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      kind: { default: 'info' },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout-kind]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-callout-kind': HTMLAttributes.kind ?? 'info',
        class: 'callout-node',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (kind: CalloutKind = 'info') =>
        ({ commands }) => commands.insertContent({
          type: this.name,
          attrs: { kind },
          content: [{ type: 'paragraph' }],
        }),
    };
  },
});
