import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTableToolbarPosition,
  resolveTableContext,
  selectTableColumn,
  selectTableRow,
  type TableContextState,
  type TableToolbarPosition,
} from './tableContextModel';

interface TableContextToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onConfirmDeleteTable: () => Promise<boolean>;
}

type MenuKey = 'row' | 'column' | 'cell' | 'table';

interface ToolbarState {
  context: TableContextState;
  position: TableToolbarPosition;
  tableRect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom'>;
  rows: AxisSegment[];
  columns: AxisSegment[];
}

interface AxisSegment {
  index: number;
  start: number;
  size: number;
}

const MENU_GROUPS: Array<{ key: MenuKey; label: string }> = [
  { key: 'row', label: '行' },
  { key: 'column', label: '列' },
  { key: 'cell', label: '单元格' },
  { key: 'table', label: '表格' },
];

export function TableContextToolbar({
  editor,
  disabled = false,
  onConfirmDeleteTable,
}: TableContextToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>();
  const [openMenu, setOpenMenu] = useState<MenuKey>();

  const refresh = useCallback(() => {
    if (!editor || disabled || editor.isDestroyed) {
      setToolbarState(undefined);
      setOpenMenu(undefined);
      return;
    }
    const context = resolveTableContext(editor);
    if (!context) {
      setToolbarState(undefined);
      setOpenMenu(undefined);
      return;
    }
    const elements = findTableElements(editor, context.tablePos);
    if (!elements) {
      setToolbarState(undefined);
      return;
    }
    const tableRect = elements.table.getBoundingClientRect();
    setToolbarState({
      context,
      position: getTableToolbarPosition(elements.wrapper.getBoundingClientRect(), window.innerWidth),
      tableRect,
      rows: getRowSegments(elements.table),
      columns: getColumnSegments(elements.table, context.columnCount),
    });
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return undefined;
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const hideOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)
        || toolbarRef.current?.contains(target)
        || (target instanceof Element && target.closest('[data-table-context-control]'))
        || editor.view.dom.contains(target)) {
        return;
      }
      setToolbarState(undefined);
      setOpenMenu(undefined);
    };
    document.addEventListener('pointerdown', hideOutside, true);
    refresh();
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      document.removeEventListener('pointerdown', hideOutside, true);
    };
  }, [editor, refresh]);

  if (!editor || !toolbarState) {
    return null;
  }

  const { columns, context, position, rows, tableRect } = toolbarState;
  const run = (command: () => boolean) => {
    command();
    setOpenMenu(undefined);
    window.requestAnimationFrame(refresh);
  };
  const deleteEntireTable = async () => {
    setOpenMenu(undefined);
    if (await onConfirmDeleteTable()) {
      run(() => editor.chain().focus().deleteTable().run());
    }
  };
  const deleteRow = () => {
    if (context.rowCount === 1) {
      void deleteEntireTable();
      return;
    }
    run(() => editor.chain().focus().deleteRow().run());
  };
  const deleteColumn = () => {
    if (context.columnCount === 1) {
      void deleteEntireTable();
      return;
    }
    run(() => editor.chain().focus().deleteColumn().run());
  };
  const chooseRow = (rowIndex: number) => {
    if (selectTableRow(editor, context, rowIndex)) {
      setOpenMenu('row');
      window.requestAnimationFrame(refresh);
    }
  };
  const chooseColumn = (columnIndex: number) => {
    if (selectTableColumn(editor, context, columnIndex)) {
      setOpenMenu('column');
      window.requestAnimationFrame(refresh);
    }
  };
  const insertRowAt = (boundaryIndex: number) => {
    const rowIndex = Math.min(boundaryIndex, context.rowCount - 1);
    if (!selectTableRow(editor, context, rowIndex)) return;
    run(() => boundaryIndex === context.rowCount
      ? editor.chain().focus().addRowAfter().run()
      : editor.chain().focus().addRowBefore().run());
  };
  const insertColumnAt = (boundaryIndex: number) => {
    const columnIndex = Math.min(boundaryIndex, context.columnCount - 1);
    if (!selectTableColumn(editor, context, columnIndex)) return;
    run(() => boundaryIndex === context.columnCount
      ? editor.chain().focus().addColumnAfter().run()
      : editor.chain().focus().addColumnBefore().run());
  };
  const removeRowAt = (rowIndex: number) => {
    if (!selectTableRow(editor, context, rowIndex)) return;
    if (context.rowCount === 1) {
      void deleteEntireTable();
      return;
    }
    run(() => editor.chain().focus().deleteRow().run());
  };
  const removeColumnAt = (columnIndex: number) => {
    if (!selectTableColumn(editor, context, columnIndex)) return;
    if (context.columnCount === 1) {
      void deleteEntireTable();
      return;
    }
    run(() => editor.chain().focus().deleteColumn().run());
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="table-context-toolbar"
        data-placement={position.placement}
        data-table-context-control
        style={{ top: position.top, left: position.left, maxWidth: position.maxWidth }}
        onMouseLeave={() => setOpenMenu(undefined)}
      >
        <div className="table-context-toolbar-scroll">
          {MENU_GROUPS.map((group) => (
            <div key={group.key} className="table-context-menu-group" onMouseEnter={() => setOpenMenu(group.key)}>
              <button
                aria-expanded={openMenu === group.key}
                className="table-context-trigger"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpenMenu((current) => current === group.key ? undefined : group.key)}
              >
                {group.label}<span aria-hidden>⌄</span>
              </button>
              {openMenu === group.key ? renderSubmenu(group.key) : null}
            </div>
          ))}
        </div>
      </div>
      {rows.map((row) => (
        <span key={`row-${row.index}`}>
          <button
            aria-label={`选择第 ${row.index + 1} 行`}
            aria-pressed={context.rowIndex === row.index}
            className="table-row-handle"
            data-table-context-control
            type="button"
            style={{ left: tableRect.left - 26, top: row.start + row.size / 2 }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseRow(row.index)}
          ><span aria-hidden>⋮</span></button>
          {context.rowIndex === row.index ? (
            <button
              aria-label={`删除第 ${row.index + 1} 行`}
              className="table-row-delete-handle"
              data-table-context-control
              type="button"
              style={{ left: tableRect.left - 50, top: row.start + row.size / 2 }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => removeRowAt(row.index)}
            ><span aria-hidden>×</span></button>
          ) : null}
        </span>
      ))}
      {columns.map((column) => (
        <span key={`column-${column.index}`}>
          <button
            aria-label={`选择第 ${column.index + 1} 列`}
            aria-pressed={context.columnIndex === column.index}
            className="table-column-handle"
            data-table-context-control
            type="button"
            style={{ left: column.start + column.size / 2, top: tableRect.top - 26 }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseColumn(column.index)}
          ><span aria-hidden>⋯</span></button>
          {context.columnIndex === column.index ? (
            <button
              aria-label={`删除第 ${column.index + 1} 列`}
              className="table-column-delete-handle"
              data-table-context-control
              type="button"
              style={{ left: column.start + column.size / 2, top: tableRect.top - 50 }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => removeColumnAt(column.index)}
            ><span aria-hidden>×</span></button>
          ) : null}
        </span>
      ))}
      {getBoundaries(rows, tableRect.top, tableRect.bottom).map((boundary, index) => (
        <button
          key={`insert-row-${index}`}
          aria-label={`在第 ${index + 1} 个行边界插入行`}
          className="table-row-insert-handle"
          data-table-context-control
          type="button"
          style={{ left: tableRect.left - 26, top: boundary }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertRowAt(index)}
        ><span aria-hidden>+</span></button>
      ))}
      {getBoundaries(columns, tableRect.left, tableRect.right).map((boundary, index) => (
        <button
          key={`insert-column-${index}`}
          aria-label={`在第 ${index + 1} 个列边界插入列`}
          className="table-column-insert-handle"
          data-table-context-control
          type="button"
          style={{ left: boundary, top: tableRect.top - 26 }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertColumnAt(index)}
        ><span aria-hidden>+</span></button>
      ))}
    </>
  );

  function renderSubmenu(menu: MenuKey) {
    if (menu === 'row') {
      return (
        <TableSubmenu>
          <TableMenuButton label="在上方新增行" onClick={() => run(() => editor.chain().focus().addRowBefore().run())} />
          <TableMenuButton label="在下方新增行" onClick={() => run(() => editor.chain().focus().addRowAfter().run())} />
          <TableMenuButton danger label="删除当前行" onClick={deleteRow} />
        </TableSubmenu>
      );
    }
    if (menu === 'column') {
      return (
        <TableSubmenu>
          <TableMenuButton label="在左侧新增列" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} />
          <TableMenuButton label="在右侧新增列" onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} />
          <TableMenuButton danger label="删除当前列" onClick={deleteColumn} />
        </TableSubmenu>
      );
    }
    if (menu === 'cell') {
      return (
        <TableSubmenu>
          <TableMenuButton disabled={!context.canMerge} label="合并所选单元格" onClick={() => run(() => editor.chain().focus().mergeCells().run())} />
          <TableMenuButton disabled={!context.canSplit} label="拆分当前单元格" onClick={() => run(() => editor.chain().focus().splitCell().run())} />
        </TableSubmenu>
      );
    }
    return (
      <TableSubmenu>
        <TableMenuButton label="切换首行表头" onClick={() => run(() => editor.chain().focus().toggleHeaderRow().run())} />
        <TableMenuButton danger label="删除整张表格" onClick={() => void deleteEntireTable()} />
      </TableSubmenu>
    );
  }
}

function findTableElements(editor: Editor, tablePos: number): { table: HTMLTableElement; wrapper: HTMLElement } | undefined {
  const domNode = editor.view.domAtPos(tablePos + 1).node;
  const element = domNode instanceof Element ? domNode : domNode.parentElement;
  const table = element?.closest('table') ?? element?.querySelector('table');
  if (!(table instanceof HTMLTableElement)) return undefined;
  return { table, wrapper: (table.closest('.tableWrapper') ?? table) as HTMLElement };
}

function getRowSegments(table: HTMLTableElement): AxisSegment[] {
  return Array.from(table.rows).map((row, index) => {
    const rect = row.getBoundingClientRect();
    return { index, start: rect.top, size: rect.height };
  });
}

function getColumnSegments(table: HTMLTableElement, columnCount: number): AxisSegment[] {
  const firstRow = table.rows.item(0);
  if (!firstRow) return [];
  const columns: AxisSegment[] = [];
  let columnIndex = 0;
  for (const cell of Array.from(firstRow.cells)) {
    const rect = cell.getBoundingClientRect();
    const span = Math.max(1, cell.colSpan);
    const width = rect.width / span;
    for (let offset = 0; offset < span && columnIndex < columnCount; offset += 1) {
      columns.push({ index: columnIndex, start: rect.left + width * offset, size: width });
      columnIndex += 1;
    }
  }
  return columns;
}

function getBoundaries(segments: AxisSegment[], start: number, end: number): number[] {
  if (segments.length === 0) return [];
  return [start, ...segments.slice(0, -1).map((segment) => segment.start + segment.size), end];
}

function TableSubmenu({ children }: { children: React.ReactNode }) {
  return <div className="table-context-submenu">{children}</div>;
}

function TableMenuButton({
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`table-context-menu-item ${danger ? 'is-danger' : ''}`}
      disabled={disabled}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
