import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { CellSelection, TableMap } from '@tiptap/pm/tables';

export interface TableContextState {
  tablePos: number;
  rowCount: number;
  columnCount: number;
  rowIndex: number;
  columnIndex: number;
  selectionKind: 'cell' | 'cells' | 'row' | 'column' | 'table';
  canMerge: boolean;
  canSplit: boolean;
}

export interface TableToolbarPosition {
  top: number;
  left: number;
  maxWidth: number;
  placement: 'above' | 'inside';
}

type TableRect = Pick<DOMRect, 'top' | 'left' | 'width' | 'bottom'>;

export function resolveTableContext(editor: Editor): TableContextState | undefined {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
    const map = TableMap.get(selection.node);
    return {
      tablePos: selection.from,
      rowCount: map.height,
      columnCount: map.width,
      rowIndex: 0,
      columnIndex: 0,
      selectionKind: 'table',
      canMerge: false,
      canSplit: false,
    };
  }
  const { $from } = selection;
  let cellDepth: number | undefined;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell') {
      cellDepth = depth;
    }
    if (node.type.name !== 'table') {
      continue;
    }
    const map = TableMap.get(node);
    const tablePos = $from.before(depth);
    const relativeCellPos = cellDepth === undefined
      ? map.positionAt(0, 0, node)
      : $from.before(cellDepth) - tablePos - 1;
    const cellRect = map.findCell(relativeCellPos);
    const selectionKind = selection instanceof CellSelection
      ? selection.isRowSelection()
        ? 'row'
        : selection.isColSelection()
          ? 'column'
          : 'cells'
      : 'cell';
    return {
      tablePos,
      rowCount: map.height,
      columnCount: map.width,
      rowIndex: cellRect.top,
      columnIndex: cellRect.left,
      selectionKind,
      canMerge: editor.can().chain().focus().mergeCells().run(),
      canSplit: editor.can().chain().focus().splitCell().run(),
    };
  }
  return undefined;
}

export function selectTableRow(
  editor: Editor,
  context: TableContextState,
  rowIndex: number,
): boolean {
  const table = editor.state.doc.nodeAt(context.tablePos);
  if (!table || rowIndex < 0 || rowIndex >= context.rowCount) return false;
  const map = TableMap.get(table);
  const tableStart = context.tablePos + 1;
  const anchor = tableStart + map.positionAt(rowIndex, 0, table);
  const head = tableStart + map.positionAt(rowIndex, map.width - 1, table);
  editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, anchor, head)));
  editor.view.focus();
  return true;
}

export function selectTableColumn(
  editor: Editor,
  context: TableContextState,
  columnIndex: number,
): boolean {
  const table = editor.state.doc.nodeAt(context.tablePos);
  if (!table || columnIndex < 0 || columnIndex >= context.columnCount) return false;
  const map = TableMap.get(table);
  const tableStart = context.tablePos + 1;
  const anchor = tableStart + map.positionAt(0, columnIndex, table);
  const head = tableStart + map.positionAt(map.height - 1, columnIndex, table);
  editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, anchor, head)));
  editor.view.focus();
  return true;
}

export function getTableToolbarPosition(rect: TableRect, viewportWidth: number): TableToolbarPosition {
  const viewportPadding = 16;
  const maxWidth = Math.max(0, Math.min(rect.width, viewportWidth - viewportPadding * 2));
  const left = Math.max(
    viewportPadding,
    Math.min(rect.left, viewportWidth - maxWidth - viewportPadding),
  );
  const placement = rect.top >= 56 ? 'above' : 'inside';
  return {
    top: placement === 'above' ? rect.top - 48 : rect.top + 8,
    left,
    maxWidth,
    placement,
  };
}
