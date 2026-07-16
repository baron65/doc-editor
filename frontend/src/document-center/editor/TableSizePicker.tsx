import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_TABLE_GRID_SIZE,
  MAX_TABLE_DIMENSION,
  expandTableGrid,
  normalizeTableDimension,
} from './tableSizePickerModel';

interface TableSizePickerProps {
  onCancel: () => void;
  onInsert: (rows: number, columns: number) => void;
  position: { top: number; left: number };
}

export function TableSizePicker({ onCancel, onInsert, position }: TableSizePickerProps) {
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [visibleRows, setVisibleRows] = useState(INITIAL_TABLE_GRID_SIZE);
  const [visibleColumns, setVisibleColumns] = useState(INITIAL_TABLE_GRID_SIZE);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const setExactRows = (value: number) => {
    const next = normalizeTableDimension(value);
    setRows(next);
    setVisibleRows((current) => Math.max(current, next));
  };
  const setExactColumns = (value: number) => {
    const next = normalizeTableDimension(value);
    setColumns(next);
    setVisibleColumns((current) => Math.max(current, next));
  };
  const hoverCell = (row: number, column: number) => {
    setRows(row);
    setColumns(column);
    setVisibleRows((current) => expandTableGrid(current, row));
    setVisibleColumns((current) => expandTableGrid(current, column));
  };
  const beginDrag = (event: React.PointerEvent<HTMLButtonElement>, row: number, column: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
    hoverCell(row, column);
  };
  const dragAcross = (row: number, column: number) => {
    if (draggingRef.current) hoverCell(row, column);
  };
  const dimensionsAtPointer = (event: React.PointerEvent<HTMLElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-table-row][data-table-column]');
    const row = Number(element?.dataset.tableRow);
    const column = Number(element?.dataset.tableColumn);
    return Number.isFinite(row) && Number.isFinite(column) ? { row, column } : undefined;
  };
  const dragAcrossPointer = (event: React.PointerEvent<HTMLElement>) => {
    const dimensions = dimensionsAtPointer(event);
    if (dimensions) dragAcross(dimensions.row, dimensions.column);
  };
  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const dimensions = dimensionsAtPointer(event) ?? { row: rows, column: columns };
    hoverCell(dimensions.row, dimensions.column);
    onInsert(dimensions.row, dimensions.column);
  };
  const cancelDrag = () => {
    draggingRef.current = false;
    setDragging(false);
  };

  return (
    <div
      aria-label="表格尺寸选择"
      className="table-size-picker"
      role="dialog"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="text-sm text-gray-800">插入 {rows} × {columns} 表格</strong>
        <button className="text-xs text-gray-400 hover:text-gray-700" type="button" onClick={onCancel}>关闭</button>
      </div>
      <div
        className={`table-size-picker-grid ${dragging ? 'is-dragging' : ''}`}
        style={{ gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))` }}
        onPointerMove={dragAcrossPointer}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
      >
        {Array.from({ length: visibleRows * visibleColumns }, (_, index) => {
          const row = Math.floor(index / visibleColumns) + 1;
          const column = index % visibleColumns + 1;
          const selected = row <= rows && column <= columns;
          return (
            <button
              key={`${row}-${column}`}
              aria-label={`${row} 行 ${column} 列`}
              className={`table-size-picker-cell ${selected ? 'is-selected' : ''}`}
              data-table-column={column}
              data-table-row={row}
              type="button"
              onPointerDown={(event) => beginDrag(event, row, column)}
              onPointerEnter={() => dragAcross(row, column)}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">
          行数
          <input
            aria-label="表格行数"
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-400"
            max={MAX_TABLE_DIMENSION}
            min={1}
            type="number"
            value={rows}
            onChange={(event) => setExactRows(Number(event.target.value))}
          />
        </label>
        <label className="text-xs text-gray-500">
          列数
          <input
            aria-label="表格列数"
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-400"
            max={MAX_TABLE_DIMENSION}
            min={1}
            type="number"
            value={columns}
            onChange={(event) => setExactColumns(Number(event.target.value))}
          />
        </label>
      </div>
      <button
        className="mt-3 w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onInsert(rows, columns)}
      >
        插入 {rows} × {columns} 表格
      </button>
    </div>
  );
}
