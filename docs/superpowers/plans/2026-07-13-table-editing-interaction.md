# 表格编辑交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有管理端 Tiptap 编辑器中增加飞书式表格悬浮工具条、完整行列操作、单元格合并拆分、表头切换和列宽拖动。

**Architecture:** 保留现有 Tiptap Table Schema，通过 `TableContextToolbar` 订阅 selection/transaction/scroll 事件并调用原生表格命令。纯选择解析与定位边界放入 `tableContextModel.ts`，便于独立测试；删除整表复用 `useAppDialog().confirm`，所有 transaction 继续触发现有自动保存。

**Tech Stack:** React 18.2、TypeScript 4.9.5、Tiptap 3.27.3、ProseMirror TableMap、Tailwind CSS 3.4.17、Node test runner。

## Global Constraints

- 不修改现有 Tiptap JSON Schema、后端接口、数据库字段或自动保存协议。
- 只实现行列、单元格和表格结构操作，不增加公式、排序或单元格颜色。
- 不使用 `window.prompt`、`window.confirm`，删除整表必须复用项目公共确认弹框。
- 保留现有用户修改，不执行 Git 暂存、提交、重置或清理。
- 每个实现任务先写失败测试，再做最小实现并执行验证。

---

### Task 1: 表格上下文模型

**Files:**
- Create: `frontend/src/document-center/editor/tableContextModel.ts`
- Create: `frontend/src/document-center/editor/tableContextModel.test.ts`

**Interfaces:**
- Consumes: `Editor` from `@tiptap/core`、`TableMap` from `@tiptap/pm/tables`。
- Produces:
  - `TableContextState { tablePos, rowCount, columnCount, canMerge, canSplit }`
  - `resolveTableContext(editor: Editor): TableContextState | undefined`
  - `getTableToolbarPosition(rect: Pick<DOMRect, 'top' | 'left' | 'width' | 'bottom'>, viewportWidth: number): { top, left, maxWidth, placement }`

- [ ] **Step 1: 写选择解析失败测试**

使用真实 Tiptap `Editor` 创建 2×2 表格，将光标放入单元格并断言 `resolveTableContext()` 返回行列数；光标在普通段落时返回 `undefined`。

```ts
const editor = new Editor({
  extensions: createDocumentExtensions(),
  content: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '前文' }] },
      {
        type: 'table',
        content: Array.from({ length: 2 }, () => ({
          type: 'tableRow',
          content: Array.from({ length: 2 }, () => ({
            type: 'tableCell',
            content: [{ type: 'paragraph' }],
          })),
        })),
      },
    ],
  },
});
editor.commands.setTextSelection(8);
assert.deepEqual(resolveTableContext(editor), {
  tablePos: 4,
  rowCount: 2,
  columnCount: 2,
  canMerge: false,
  canSplit: false,
});
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `cd frontend && node --test src/document-center/editor/tableContextModel.test.ts`

Expected: FAIL，提示无法加载 `tableContextModel.ts` 或导出不存在。

- [ ] **Step 3: 实现表格节点解析和命令可用性**

从 `editor.state.selection.$from` 向上查找 `node.type.name === 'table'`，使用 `TableMap.get(tableNode)` 获取 `height` 和 `width`，使用 `editor.can().chain().focus().mergeCells().run()` 与 `splitCell()` 获取可用状态。

```ts
export function resolveTableContext(editor: Editor): TableContextState | undefined {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== 'table') continue;
    const map = TableMap.get(node);
    return {
      tablePos: $from.before(depth),
      rowCount: map.height,
      columnCount: map.width,
      canMerge: editor.can().chain().focus().mergeCells().run(),
      canSplit: editor.can().chain().focus().splitCell().run(),
    };
  }
  return undefined;
}
```

- [ ] **Step 4: 实现并测试视口安全定位**

定位策略优先表格上方；上方不足 56px 时放到表格内部顶部。水平方向限制在 `16px` 到 `viewportWidth - maxWidth - 16px`。

```ts
assert.deepEqual(
  getTableToolbarPosition({ top: 100, bottom: 400, left: 300, width: 600 }, 1200),
  { top: 52, left: 300, maxWidth: 600, placement: 'above' },
);
assert.equal(
  getTableToolbarPosition({ top: 20, bottom: 400, left: 8, width: 600 }, 700).placement,
  'inside',
);
```

- [ ] **Step 5: 运行模型测试**

Run: `cd frontend && node --test src/document-center/editor/tableContextModel.test.ts`

Expected: PASS。

---

### Task 2: 开启列宽调整并增强表格选择反馈

**Files:**
- Modify: `frontend/src/document-center/editor/documentSchemaExtensions.ts`
- Modify: `frontend/src/global.css`
- Modify: `frontend/src/document-center/reader/readerLayout.test.mjs`

**Interfaces:**
- Consumes: Tiptap `Table.configure()`。
- Produces: `resizable: true`、`handleWidth: 6`、`cellMinWidth: 80`、`lastColumnResizable: true`、`allowTableNodeSelection: true`。

- [ ] **Step 1: 写 Table 配置和 CSS 失败测试**

在 `readerLayout.test.mjs` 读取 `documentSchemaExtensions.ts` 与 `global.css`，断言配置和拖动样式存在。

```js
assert.match(schemaSource, /resizable: true/);
assert.match(schemaSource, /handleWidth: 6/);
assert.match(schemaSource, /cellMinWidth: 80/);
assert.match(globalStyles, /\.column-resize-handle/);
assert.match(globalStyles, /\.resize-cursor/);
assert.match(globalStyles, /\.selectedCell::after/);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd frontend && node --test src/document-center/reader/readerLayout.test.mjs`

Expected: FAIL，因为当前配置仍为 `resizable: false`。

- [ ] **Step 3: 修改 Table 配置**

```ts
Table.configure({
  resizable: true,
  handleWidth: 6,
  cellMinWidth: 80,
  lastColumnResizable: true,
  allowTableNodeSelection: true,
})
```

- [ ] **Step 4: 增加列宽手柄和选区样式**

`.column-resize-handle` 使用绝对定位贴在单元格右侧、宽 6px、蓝色半透明；`body.resize-cursor` 使用 `col-resize`；`.selectedCell::after` 保留现有浅蓝背景并增加内描边。表格 wrapper 继续独立横向滚动。

- [ ] **Step 5: 运行目标测试和类型检查**

Run: `cd frontend && node --test src/document-center/reader/readerLayout.test.mjs && pnpm typecheck`

Expected: PASS。

---

### Task 3: 飞书式表格悬浮工具条

**Files:**
- Create: `frontend/src/document-center/editor/TableContextToolbar.tsx`
- Create: `frontend/src/document-center/editor/tableContextToolbar.test.mjs`
- Modify: `frontend/src/document-center/editor/DocumentEditorShell.tsx`
- Modify: `frontend/src/global.css`

**Interfaces:**
- Consumes: `resolveTableContext()`、`getTableToolbarPosition()`、Tiptap `Editor`。
- Produces:

```ts
interface TableContextToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onConfirmDeleteTable: () => Promise<boolean>;
}
```

- [ ] **Step 1: 写工具条结构失败测试**

静态读取组件并断言存在四组菜单、完整命令、事件订阅和确认回调。

```js
for (const label of ['行', '列', '单元格', '表格']) assert.match(source, new RegExp(`>${label}<`));
for (const command of [
  'addRowBefore', 'addRowAfter', 'deleteRow',
  'addColumnBefore', 'addColumnAfter', 'deleteColumn',
  'mergeCells', 'splitCell', 'toggleHeaderRow', 'deleteTable',
]) assert.match(source, new RegExp(`\\.${command}\\(`));
assert.match(source, /selectionUpdate/);
assert.match(source, /transaction/);
assert.match(source, /onConfirmDeleteTable/);
```

- [ ] **Step 2: 运行测试并确认组件不存在**

Run: `cd frontend && node --test src/document-center/editor/tableContextToolbar.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 实现状态监听和定位**

组件监听 `selectionUpdate`、`transaction`，并在捕获阶段监听 `scroll`、`resize`。刷新时调用 `resolveTableContext(editor)`；通过 `editor.view.domAtPos(tablePos + 1)` 找到最近的 `.tableWrapper`，读取 `getBoundingClientRect()` 并计算 fixed 定位。无表格上下文时隐藏。

- [ ] **Step 4: 实现四组级联菜单**

主工具条只显示“行、列、单元格、表格”；hover 或点击后在对应按钮下方显示竖向子菜单。菜单项统一通过 `editor.chain().focus()` 执行：

```ts
const actions = {
  addRowBefore: () => editor.chain().focus().addRowBefore().run(),
  addRowAfter: () => editor.chain().focus().addRowAfter().run(),
  addColumnBefore: () => editor.chain().focus().addColumnBefore().run(),
  addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
  mergeCells: () => editor.chain().focus().mergeCells().run(),
  splitCell: () => editor.chain().focus().splitCell().run(),
  toggleHeaderRow: () => editor.chain().focus().toggleHeaderRow().run(),
};
```

`mergeCells`、`splitCell` 根据模型状态禁用。执行后关闭子菜单并立即刷新上下文。

- [ ] **Step 5: 实现删除边界和整表确认**

删除行时 `rowCount === 1`、删除列时 `columnCount === 1`，与直接删除整表一样先执行 `await onConfirmDeleteTable()`；确认后调用 `deleteTable()`。普通行列删除直接调用 `deleteRow()`/`deleteColumn()`。

- [ ] **Step 6: 在编辑器挂载并接入公共弹框**

`DocumentEditorShell` 从 `useAppDialog()` 同时取出 `confirm`，在 `BlockContextToolbar` 后挂载：

```tsx
<TableContextToolbar
  editor={editor}
  disabled={busy || previewOpen}
  onConfirmDeleteTable={() => confirm({
    title: '删除表格',
    description: '删除后表格及其中内容将从当前草稿移除。',
    confirmText: '删除表格',
    danger: true,
  })}
/>
```

- [ ] **Step 7: 增加工具条视觉和窄屏适配**

工具条为 fixed 白色卡片、圆角、细边框和阴影；子菜单使用绝对定位；最大宽度不超过当前表格或视口；按钮保持单行，窄屏时工具条横向滚动。工具条 `z-index` 低于公共弹框和预览弹层。

- [ ] **Step 8: 运行组件测试、全量类型检查**

Run: `cd frontend && node --test src/document-center/editor/tableContextToolbar.test.mjs && pnpm typecheck`

Expected: PASS。

---

### Task 4: 完整回归验证

**Files:**
- Modify only if failures expose an implementation defect in Tasks 1–3.

**Interfaces:**
- Consumes: Tasks 1–3 completed implementation。
- Produces: 可构建、可自动保存的表格编辑能力。

- [ ] **Step 1: 运行全部前端测试**

Run: `cd frontend && node --test src/document-center/**/*.test.mjs src/document-center/**/*.test.ts`

Expected: 所有测试通过；仅允许现有 `MODULE_TYPELESS_PACKAGE_JSON` 提示。

- [ ] **Step 2: 运行类型检查和生产构建**

Run: `cd frontend && pnpm typecheck && pnpm build`

Expected: exit code 0。

- [ ] **Step 3: 检查 Diff**

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 4: 本地端到端验收**

在管理端选择现有表格，依次验证新增/删除行列、拖动列宽、多选合并、拆分、切换表头、取消和确认删除整表。等待自动保存后刷新页面，并用“用户视角预览”确认表格结构和列宽保持一致。
