import type { Editor } from '@tiptap/core';
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InlineToolIcon } from './InlineToolIcon';
import {
  SAFE_FONT_SIZES,
  SAFE_TEXT_BACKGROUND_COLORS,
  SAFE_TEXT_COLORS,
  type BlockTextAlign,
} from '../content/blockFormatting';
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

type FormatPanel = 'align' | 'fontSize' | 'textColor' | 'backgroundColor';
type TableIconName =
  | 'table'
  | 'header'
  | 'merge'
  | 'split'
  | 'palette'
  | 'fontSize'
  | 'align'
  | 'bold'
  | 'strike'
  | 'italic'
  | 'underline'
  | 'code'
  | 'textColor'
  | 'delete';

interface ToolbarState {
  context: TableContextState;
  position: TableToolbarPosition;
  tableRect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;
  wrapperRect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;
  isHeaderRow: boolean;
  rows: AxisSegment[];
  columns: AxisSegment[];
}

interface AxisSegment {
  index: number;
  start: number;
  size: number;
}

export function TableContextToolbar({
  editor,
  disabled = false,
  onConfirmDeleteTable,
}: TableContextToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>();
  const [formatPanel, setFormatPanel] = useState<FormatPanel>();

  const refresh = useCallback(() => {
    if (!editor || disabled || editor.isDestroyed) {
      setToolbarState(undefined);
      setFormatPanel(undefined);
      return;
    }
    const context = resolveTableContext(editor);
    if (!context) {
      setToolbarState(undefined);
      setFormatPanel(undefined);
      return;
    }
    const elements = findTableElements(editor, context.tablePos);
    if (!elements) {
      setToolbarState(undefined);
      return;
    }
    const tableRect = elements.table.getBoundingClientRect();
    const wrapperRect = elements.wrapper.getBoundingClientRect();
    const activeRow = elements.table.rows.item(context.rowIndex);
    setToolbarState({
      context,
      position: getTableToolbarPosition(wrapperRect, window.innerWidth),
      tableRect,
      wrapperRect,
      isHeaderRow: Boolean(activeRow?.cells.length)
        && Array.from(activeRow?.cells ?? []).every((cell) => cell.tagName === 'TH'),
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
      if (!(target instanceof Node)) return;
      if (toolbarRef.current?.contains(target)
        || (target instanceof Element && target.closest('[data-table-context-control]'))) {
        return;
      }
      setFormatPanel(undefined);
      if (!editor.view.dom.contains(target)) {
        setToolbarState(undefined);
      }
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

  if (!editor || !toolbarState) return null;

  const { columns, context, isHeaderRow, position, rows, tableRect, wrapperRect } = toolbarState;
  const toolbarWidth = Math.min(760, window.innerWidth - 32);
  const toolbarLeft = Math.max(16, Math.min(position.left, window.innerWidth - toolbarWidth - 16));
  const railOffset = 9;
  const rowActive = context.selectionKind === 'row';
  const columnActive = context.selectionKind === 'column';
  const tableActive = context.selectionKind === 'table';
  const cellRangeActive = context.selectionKind === 'cells';
  const showToolbar = rowActive || columnActive || cellRangeActive || tableActive;
  const deleteActionLabel = rowActive
    ? '删除所选行'
    : columnActive
      ? '删除所选列'
      : tableActive
        ? '删除表格'
        : '删除表格';

  const run = (command: () => boolean) => {
    command();
    setFormatPanel(undefined);
    window.requestAnimationFrame(refresh);
  };
  const deleteEntireTable = async () => {
    setFormatPanel(undefined);
    if (await onConfirmDeleteTable()) {
      run(() => editor.chain().focus().deleteTable().run());
    }
  };
  const deleteSelected = () => {
    if (rowActive) {
      if (context.rowCount === 1) void deleteEntireTable();
      else run(() => editor.chain().focus().deleteRow().run());
      return;
    }
    if (columnActive) {
      if (context.columnCount === 1) void deleteEntireTable();
      else run(() => editor.chain().focus().deleteColumn().run());
      return;
    }
    void deleteEntireTable();
  };
  const chooseRow = (rowIndex: number) => {
    if (selectTableRow(editor, context, rowIndex)) {
      setFormatPanel(undefined);
      window.requestAnimationFrame(refresh);
    }
  };
  const chooseColumn = (columnIndex: number) => {
    if (selectTableColumn(editor, context, columnIndex)) {
      setFormatPanel(undefined);
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

  return (
    <>
      <button
        aria-label="选择整张表格"
        aria-pressed={tableActive}
        className="table-master-handle"
        data-table-context-control
        data-tooltip="选择整张表格"
        style={{ left: wrapperRect.left - 58, top: tableRect.top - 25 }}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run(() => editor.chain().focus().setNodeSelection(context.tablePos).run())}
      >
        <TableToolIcon name="table" />
        <span className="table-master-grip" aria-hidden>⠿</span>
      </button>

      <div
        aria-label="选择表格列"
        className="table-column-rail"
        data-table-context-control
        style={{ left: wrapperRect.left, top: tableRect.top - railOffset, width: wrapperRect.width }}
      >
        {columns.map((column) => (
          <button
            key={column.index}
            aria-label={`选择第 ${column.index + 1} 列`}
            aria-pressed={columnActive && context.columnIndex === column.index}
            className="table-column-rail-segment"
            type="button"
            style={{ left: column.start - wrapperRect.left, width: column.size }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseColumn(column.index)}
          />
        ))}
      </div>

      <div
        aria-label="选择表格行"
        className="table-row-rail"
        data-table-context-control
        style={{ left: wrapperRect.left - railOffset, top: tableRect.top, height: tableRect.height }}
      >
        {rows.map((row) => (
          <button
            key={row.index}
            aria-label={`选择第 ${row.index + 1} 行`}
            aria-pressed={rowActive && context.rowIndex === row.index}
            className="table-row-rail-segment"
            type="button"
            style={{ top: row.start - tableRect.top, height: row.size }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseRow(row.index)}
          />
        ))}
      </div>

      {getBoundaries(rows, tableRect.top, tableRect.bottom).map((boundary, index) => (
        <button
          key={`row-boundary-${index}`}
          aria-label={`在第 ${index + 1} 个行边界插入行`}
          className="table-row-boundary-insert"
          data-table-context-control
          data-tooltip="插入行"
          type="button"
          style={{ left: wrapperRect.left - railOffset, top: boundary }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertRowAt(index)}
        >
          <span aria-hidden>+</span>
          <i className="table-insert-line is-row" style={{ left: wrapperRect.left, top: boundary, width: wrapperRect.width }} />
        </button>
      ))}

      {getBoundaries(columns, tableRect.left, tableRect.right).map((boundary, index) => {
        if (boundary < wrapperRect.left || boundary > wrapperRect.right) return null;
        return (
          <button
            key={`column-boundary-${index}`}
            aria-label={`在第 ${index + 1} 个列边界插入列`}
            className="table-column-boundary-insert"
            data-table-context-control
            data-tooltip="插入列"
            type="button"
            style={{ left: boundary, top: tableRect.top - railOffset }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertColumnAt(index)}
          >
            <span aria-hidden>+</span>
            <i className="table-insert-line is-column" style={{ left: boundary, top: tableRect.top, height: tableRect.height }} />
          </button>
        );
      })}

      {showToolbar ? <div
        ref={toolbarRef}
        aria-label="表格操作工具栏"
        className="table-context-toolbar rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
        data-placement={position.placement}
        data-table-context-control
        role="toolbar"
        style={{ top: position.top, left: toolbarLeft, maxWidth: toolbarWidth }}
      >
        <div className="table-context-toolbar-scroll">
          <TableToolButton
            active={isHeaderRow}
            aria-label="设置为标题行"
            data-tooltip={isHeaderRow ? '取消标题行' : '设置为标题行'}
            disabled={!rowActive && !tableActive}
            icon={<TableToolIcon name="header" />}
            onRun={() => run(() => editor.chain().focus().toggleHeaderRow().run())}
          />
          <TableToolButton
            aria-label="合并单元格"
            data-tooltip="合并单元格"
            disabled={!context.canMerge}
            icon={<TableToolIcon name="merge" />}
            onRun={() => run(() => editor.chain().focus().mergeCells().run())}
          />
          <TableToolButton
            aria-label="拆分单元格"
            data-tooltip="拆分单元格"
            disabled={!context.canSplit}
            icon={<TableToolIcon name="split" />}
            onRun={() => run(() => editor.chain().focus().splitCell().run())}
          />
          <ToolbarDivider />
          <TableToolButton
            aria-label="单元格背景"
            data-tooltip="单元格背景"
            icon={<TableToolIcon name="palette" />}
            onRun={() => togglePanel(setFormatPanel, 'backgroundColor')}
          />
          <TableToolButton
            aria-label="字号"
            data-tooltip="字号"
            icon={<TableToolIcon name="fontSize" />}
            onRun={() => togglePanel(setFormatPanel, 'fontSize')}
          />
          <TableToolButton
            aria-label="对齐方式"
            data-tooltip="对齐方式"
            icon={<TableToolIcon name="align" />}
            onRun={() => togglePanel(setFormatPanel, 'align')}
          />
          <ToolbarDivider />
          <TableToolButton active={editor.isActive('bold')} aria-label="加粗" data-tooltip="加粗 ⌘B" icon={<InlineToolIcon type="bold" />} onRun={() => run(() => editor.chain().focus().toggleBold().run())} />
          <TableToolButton active={editor.isActive('strike')} aria-label="删除线" data-tooltip="删除线 ⌘⇧X" icon={<InlineToolIcon type="strike" />} onRun={() => run(() => editor.chain().focus().toggleStrike().run())} />
          <TableToolButton active={editor.isActive('italic')} aria-label="斜体" data-tooltip="斜体 ⌘I" icon={<InlineToolIcon type="italic" />} onRun={() => run(() => editor.chain().focus().toggleItalic().run())} />
          <TableToolButton active={editor.isActive('underline')} aria-label="下划线" data-tooltip="下划线 ⌘U" icon={<InlineToolIcon type="underline" />} onRun={() => run(() => editor.chain().focus().toggleUnderline().run())} />
          <TableToolButton active={editor.isActive('code')} aria-label="行内代码" data-tooltip="行内代码" icon={<InlineToolIcon type="code" />} onRun={() => run(() => editor.chain().focus().toggleCode().run())} />
          <TableToolButton aria-label="文字颜色" data-tooltip="文字颜色" icon={<InlineToolIcon type="text-color" />} onRun={() => togglePanel(setFormatPanel, 'textColor')} />
          <ToolbarDivider />
          <TableToolButton
            danger
            aria-label={deleteActionLabel}
            data-tooltip={deleteActionLabel}
            disabled={!rowActive && !columnActive && !tableActive}
            icon={<TableToolIcon name="delete" />}
            onRun={deleteSelected}
          />
        </div>
        {formatPanel ? (
          <TableFormatPopover
            editor={editor}
            panel={formatPanel}
            onRun={run}
          />
        ) : null}
      </div> : null}
    </>
  );
}

function TableFormatPopover({
  editor,
  onRun,
  panel,
}: {
  editor: Editor;
  onRun: (command: () => boolean) => void;
  panel: FormatPanel;
}) {
  if (panel === 'align') {
    return (
      <div aria-label="对齐方式" className="table-format-popover" role="menu">
        {(['left', 'center', 'right', 'justify'] as BlockTextAlign[]).map((align) => (
          <button key={align} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onRun(() => updateSelectedCellBlocks(editor, { textAlign: align }))}>
            {alignLabel(align)}
          </button>
        ))}
      </div>
    );
  }
  if (panel === 'fontSize') {
    return (
      <div aria-label="字号" className="table-format-popover is-list" role="menu">
        {SAFE_FONT_SIZES.map((item) => (
          <button key={item.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onRun(() => editor.chain().focus().setFontSize(item.value).run())}>
            <span style={{ fontSize: item.value }}>{item.label}</span>
          </button>
        ))}
      </div>
    );
  }
  const colors = panel === 'textColor' ? SAFE_TEXT_COLORS : SAFE_TEXT_BACKGROUND_COLORS;
  return (
    <div aria-label={panel === 'textColor' ? '文字颜色' : '单元格背景'} className="table-format-popover is-colors" role="menu">
      {colors.map((item) => (
        <button
          key={item.value ?? 'default'}
          aria-label={item.label}
          className={item.value ? '' : 'is-default'}
          style={item.value ? { '--table-swatch': item.value } as CSSProperties : undefined}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onRun(() => applyTableColor(editor, panel, item.value))}
        >
          <span aria-hidden>{item.value ? '' : '×'}</span>
        </button>
      ))}
    </div>
  );
}

function TableToolButton({
  active = false,
  danger = false,
  disabled = false,
  icon,
  onRun,
  'data-tooltip': tooltip,
  ...buttonProps
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onRun: () => void;
  'aria-label': string;
  'data-tooltip': string;
}) {
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number }>();
  const showTooltip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltipPosition({
      left: Math.max(88, Math.min(rect.left + rect.width / 2, window.innerWidth - 88)),
      top: rect.bottom + 8,
    });
  };
  return (
    <span
      className="table-tool-button-wrap"
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => setTooltipPosition(undefined)}
    >
      <button
        {...buttonProps}
        aria-describedby={tooltipPosition ? tooltipId : undefined}
        aria-pressed={active}
        className={`table-tool-button group relative flex h-8 w-8 flex-none items-center justify-center rounded-md disabled:cursor-not-allowed disabled:text-gray-300 ${
          danger
            ? 'text-red-600 hover:bg-red-50'
            : active
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-700 hover:bg-gray-50'
        }`}
        disabled={disabled}
        type="button"
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={() => setTooltipPosition(undefined)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setTooltipPosition(undefined);
          onRun();
        }}
      >
        {icon}
      </button>
      {tooltipPosition && typeof document !== 'undefined'
        ? createPortal(
          <span
            id={tooltipId}
            className="table-tool-tooltip"
            role="tooltip"
            style={tooltipPosition}
          >
            {tooltip}
          </span>,
          document.body,
        )
        : null}
    </span>
  );
}

function ToolbarDivider() {
  return <span className="table-toolbar-divider" aria-hidden="true" />;
}

function TableToolIcon({ name }: { name: TableIconName }) {
  const common = {
    fill: 'none',
    height: 20,
    viewBox: '0 0 24 24',
    width: 20,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };
  if (name === 'fontSize') return <span aria-hidden className="table-text-icon">T</span>;
  return (
    <svg aria-hidden="true" {...common}>
      {name === 'table' ? <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M8 4v16M14 4v16" /></> : null}
      {name === 'header' ? <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M9 4v16M15 4v16" /><path d="M3 4h18v5H3z" fill="currentColor" opacity=".15" /></> : null}
      {name === 'merge' ? <><path d="M8 8H6a3 3 0 0 0 0 6h2M16 8h2a3 3 0 0 1 0 6h-2M8 11h8M8 14h8" /></> : null}
      {name === 'split' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M8 9l-2 3 2 3M16 9l2 3-2 3" /></> : null}
      {name === 'palette' ? <><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0-2-11Z" /><circle cx="7" cy="10" r="1" /><circle cx="9" cy="6.5" r="1" /><circle cx="14" cy="6.5" r="1" /><circle cx="17" cy="10" r="1" /></> : null}
      {name === 'align' ? <><path d="M4 6h16M4 10h11M4 14h16M4 18h9" /></> : null}
      {name === 'delete' ? <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></> : null}
    </svg>
  );
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

function togglePanel(
  setPanel: Dispatch<SetStateAction<FormatPanel | undefined>>,
  panel: FormatPanel,
) {
  setPanel((current) => current === panel ? undefined : panel);
}

function applyTableColor(editor: Editor, panel: 'textColor' | 'backgroundColor', value: string | null): boolean {
  if (panel === 'textColor') {
    return value
      ? editor.chain().focus().setTextColor(value).run()
      : editor.chain().focus().unsetTextColor().run();
  }
  return editor.chain().focus().setCellAttribute('backgroundColor', value).run();
}

function updateSelectedCellBlocks(editor: Editor, attributes: { textAlign: BlockTextAlign }): boolean {
  const { doc, selection, tr } = editor.state;
  const changedPositions = new Set<number>();
  for (const range of selection.ranges) {
    doc.nodesBetween(range.$from.pos, range.$to.pos, (node, position) => {
      if ((node.type.name === 'paragraph' || node.type.name === 'heading') && !changedPositions.has(position)) {
        tr.setNodeMarkup(position, undefined, { ...node.attrs, ...attributes });
        changedPositions.add(position);
      }
    });
  }
  if (changedPositions.size === 0) return false;
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}

function alignLabel(align: BlockTextAlign) {
  return { left: '左对齐', center: '居中', right: '右对齐', justify: '两端对齐' }[align];
}
