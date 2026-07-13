import assert from 'node:assert/strict';
import test from 'node:test';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { CellSelection, tableNodes } from '@tiptap/pm/tables';
import { deleteSelectedTable } from './TableKeyboardExtension.ts';

function createState() {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
      ...tableNodes({ tableGroup: 'block', cellContent: 'block+' }),
    },
  });
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '前文' }] },
      { type: 'table', content: [{
        type: 'table_row',
        content: [{ type: 'table_cell', content: [{ type: 'paragraph' }] }],
      }] },
      { type: 'paragraph' },
    ],
  });
  return EditorState.create({ doc });
}

test('只有整表 NodeSelection 会被键盘删除处理', () => {
  let state = createState();
  const tablePos = state.doc.child(0).nodeSize;
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, tablePos)));
  assert.equal(deleteSelectedTable(state, (transaction) => { state = state.apply(transaction); }), true);
  assert.equal(state.doc.content.content.some((node) => node.type.name === 'table'), false);

  let textState = createState();
  textState = textState.apply(textState.tr.setSelection(TextSelection.create(textState.doc, 1)));
  assert.equal(deleteSelectedTable(textState), false);

  let cellState = createState();
  const cellPos = cellState.doc.child(0).nodeSize + 2;
  cellState = cellState.apply(cellState.tr.setSelection(CellSelection.create(cellState.doc, cellPos)));
  assert.equal(deleteSelectedTable(cellState), false);
});
