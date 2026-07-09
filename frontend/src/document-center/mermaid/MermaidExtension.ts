import { mergeAttributes, Node } from '@tiptap/core';

export interface MermaidOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (source: string) => ReturnType;
    };
  }
}

export const MermaidExtension = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      source: {
        default: 'graph TD\n  A[开始] --> B[结束]',
        parseHTML: (element) => element.getAttribute('data-source') ?? '',
        renderHTML: (attributes) => ({
          'data-source': attributes.source,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
        class: 'mermaid-node rounded-xl border border-gray-200 bg-gray-50 p-4',
      }),
      ['div', { class: 'mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400' }, 'Mermaid'],
      ['pre', { class: 'whitespace-pre-wrap text-xs text-gray-600' }, node.attrs.source],
    ];
  },

  addCommands() {
    return {
      setMermaid:
        (source) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { source },
          }),
    };
  },
});
