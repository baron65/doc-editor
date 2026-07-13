import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface BlockHighlightRange {
  from: number;
  to: number;
}

export const blockHighlightPluginKey = new PluginKey<DecorationSet>('documentBlockHighlight');

export const BlockHighlightExtension = Extension.create({
  name: 'documentBlockHighlight',

  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: blockHighlightPluginKey,
      state: {
        init: () => DecorationSet.empty,
        apply(transaction, decorations) {
          const range = transaction.getMeta(blockHighlightPluginKey) as BlockHighlightRange | null | undefined;
          if (range === null) {
            return DecorationSet.empty;
          }
          if (range) {
            return DecorationSet.create(transaction.doc, [
              Decoration.node(range.from, range.to, { class: 'block-handle-highlighted' }),
            ]);
          }
          return decorations.map(transaction.mapping, transaction.doc);
        },
      },
      props: {
        decorations(state) {
          return blockHighlightPluginKey.getState(state);
        },
      },
    })];
  },
});
