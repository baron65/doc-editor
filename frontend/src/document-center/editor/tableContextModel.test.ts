import assert from 'node:assert/strict';
import test from 'node:test';
import type { Editor } from '@tiptap/core';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { CellSelection, deleteColumn, deleteRow, TableMap, tableNodes } from '@tiptap/pm/tables';
import {
  getTableToolbarPosition,
  resolveTableContext,
  selectTableColumn,
  selectTableRow,
} from './tableContextModel.ts';

function createEditor() {
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
        {
          type: 'table',
          content: Array.from({ length: 2 }, () => ({
          type: 'table_row',
          content: Array.from({ length: 2 }, () => ({
            type: 'table_cell',
              content: [{ type: 'paragraph' }],
            })),
          })),
        },
      ],
  });
  let state = EditorState.create({ doc });
  const commandChain = {
    focus() { return this; },
    mergeCells() { return this; },
    splitCell() { return this; },
    run() { return false; },
  };
  const editor = {
    get state() { return state; },
    can: () => ({ chain: () => commandChain }),
    view: {
      dispatch(transaction) {
        state = state.apply(transaction);
      },
    },
    commands: {
      setTextSelection(position: number) {
        state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, position)));
        return true;
      },
    },
  } as unknown as Editor;
  return editor;
}

test('解析当前表格的边界和行列数', () => {
  const editor = createEditor();
  editor.commands.setTextSelection(8);

  assert.deepEqual(resolveTableContext(editor), {
    tablePos: 4,
    rowCount: 2,
    columnCount: 2,
    rowIndex: 0,
    columnIndex: 0,
    canMerge: false,
    canSplit: false,
  });

  editor.commands.setTextSelection(1);
  assert.equal(resolveTableContext(editor), undefined);
});

test('整表 NodeSelection 仍可解析表格上下文', () => {
  const editor = createEditor();
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 4)));
  const context = resolveTableContext(editor);
  assert.equal(context?.tablePos, 4);
  assert.equal(context?.rowCount, 2);
  assert.equal(context?.columnCount, 2);
});

test('可按索引选中完整行或完整列', () => {
  const editor = createEditor();
  editor.commands.setTextSelection(8);
  const context = resolveTableContext(editor);
  assert.ok(context);

  assert.equal(selectTableRow(editor, context, 1), true);
  assert.ok(editor.state.selection instanceof CellSelection);
  assert.equal(editor.state.selection.$anchorCell.nodeAfter?.type.spec.tableRole, 'cell');

  assert.equal(selectTableColumn(editor, context, 1), true);
  assert.ok(editor.state.selection instanceof CellSelection);
});

test('整行和整列选区可被删除命令精确处理', () => {
  const rowEditor = createEditor();
  rowEditor.commands.setTextSelection(8);
  const rowContext = resolveTableContext(rowEditor);
  assert.ok(rowContext);
  selectTableRow(rowEditor, rowContext, 1);
  assert.equal(deleteRow(rowEditor.state, (transaction) => rowEditor.view.dispatch(transaction)), true);
  assert.equal(TableMap.get(rowEditor.state.doc.nodeAt(4)!).height, 1);

  const columnEditor = createEditor();
  columnEditor.commands.setTextSelection(8);
  const columnContext = resolveTableContext(columnEditor);
  assert.ok(columnContext);
  selectTableColumn(columnEditor, columnContext, 1);
  assert.equal(deleteColumn(columnEditor.state, (transaction) => columnEditor.view.dispatch(transaction)), true);
  assert.equal(TableMap.get(columnEditor.state.doc.nodeAt(4)!).width, 1);
});

test('表格工具条优先显示在表格上方并限制在视口内', () => {
  assert.deepEqual(
    getTableToolbarPosition({ top: 100, bottom: 400, left: 300, width: 600 }, 1200),
    { top: 52, left: 300, maxWidth: 600, placement: 'above' },
  );
  assert.deepEqual(
    getTableToolbarPosition({ top: 20, bottom: 400, left: 8, width: 600 }, 700),
    { top: 28, left: 16, maxWidth: 600, placement: 'inside' },
  );
});
