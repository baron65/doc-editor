import { Extension } from '@tiptap/core';
import { EditorState, NodeSelection, Transaction } from '@tiptap/pm/state';

export function deleteSelectedTable(
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
): boolean {
  const { selection } = state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'table') {
    return false;
  }
  dispatch?.(state.tr.delete(selection.from, selection.to).scrollIntoView());
  return true;
}

export const TableKeyboardExtension = Extension.create({
  name: 'tableKeyboard',
  priority: 1100,

  addKeyboardShortcuts() {
    const deleteTable = () => deleteSelectedTable(
      this.editor.state,
      (transaction) => this.editor.view.dispatch(transaction),
    );
    return {
      Backspace: deleteTable,
      Delete: deleteTable,
    };
  },
});
