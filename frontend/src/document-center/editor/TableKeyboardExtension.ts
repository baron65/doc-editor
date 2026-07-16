import { Extension } from '@tiptap/core';
import { EditorState, NodeSelection, Transaction } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

export function selectCurrentTableCell(
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
): boolean {
  const { selection } = state;
  if (selection instanceof CellSelection) {
    return true;
  }

  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const tableRole = $from.node(depth).type.spec.tableRole;
    if (tableRole !== 'cell' && tableRole !== 'header_cell') {
      continue;
    }
    const cellPos = $from.before(depth);
    dispatch?.(state.tr
      .setSelection(CellSelection.create(state.doc, cellPos))
      .scrollIntoView());
    return true;
  }
  return false;
}

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
      'Mod-a': () => selectCurrentTableCell(
        this.editor.state,
        (transaction) => this.editor.view.dispatch(transaction),
      ),
      Backspace: deleteTable,
      Delete: deleteTable,
    };
  },
});
