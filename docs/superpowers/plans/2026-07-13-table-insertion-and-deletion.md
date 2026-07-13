# 表格插入与整表删除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供飞书式表格尺寸拖选、精简表格工具栏，并支持整表选中后的键盘删除。

**Architecture:** 新建独立 `TableSizePicker` 管理尺寸选择，不把网格状态继续堆入块工具栏。整表删除由独立 Tiptap 扩展识别表格 `NodeSelection`，块句柄负责建立整表选择；块句柄气泡工具栏移除行列增删分组，表格专用上下文工具栏和边缘控件保持可用。

**Tech Stack:** React 18.2、TypeScript 4.9.5、Tiptap 3.27.3、ProseMirror、Tailwind CSS 3.4.17、Node Test Runner。

## Global Constraints

- 网格默认 5×5，靠近边缘扩展，最大 20×20。
- 数字输入范围为 1～20，插入时默认包含首行表头。
- 仅整表 `NodeSelection` 响应 Backspace/Delete；单元格编辑保持原行为。
- 块句柄气泡工具栏不再显示行列增删；表格专用上下文工具栏和边缘控件保持可用。
- 不新增第三方依赖，不提交或暂存 Git 变更。

---

### Task 1: 表格尺寸选择器

**Files:**
- Create: `frontend/src/document-center/editor/TableSizePicker.tsx`
- Create: `frontend/src/document-center/editor/tableSizePickerModel.ts`
- Create: `frontend/src/document-center/editor/tableSizePickerModel.test.ts`
- Create: `frontend/src/document-center/editor/tableSizePickerUi.test.mjs`
- Modify: `frontend/src/global.css`

**Interfaces:**
- Produces: `TableSizePicker({ onInsert, onCancel })`。
- Produces: `normalizeTableDimension(value): number` 和 `expandTableGrid(current, hovered): number`。

- [ ] **Step 1: 写失败测试**：验证尺寸限制 1～20、初始 5×5、边缘悬停扩展、UI 含网格与行列数字输入。
- [ ] **Step 2: 运行测试确认失败**：`pnpm exec tsx --test src/document-center/editor/tableSizePickerModel.test.ts && node --test src/document-center/editor/tableSizePickerUi.test.mjs`。
- [ ] **Step 3: 实现模型和组件**：网格按钮使用 `aria-label="N 行 M 列"`，悬停区域高亮，点击调用 `onInsert(rows, cols)`；输入框与网格尺寸同步。
- [ ] **Step 4: 添加样式**：限制弹层宽度和高度，网格单元格保持方形，选中区使用品牌蓝色。
- [ ] **Step 5: 重跑定向测试并确认通过**。

### Task 2: 接入块工具栏并移除行列菜单

**Files:**
- Modify: `frontend/src/document-center/editor/BlockContextToolbar.tsx`
- Modify: `frontend/src/document-center/editor/TableContextToolbar.tsx`
- Modify: `frontend/src/document-center/editor/editorContextActions.ts`
- Modify: `frontend/src/document-center/editor/editorContextActions.test.ts`
- Modify: `frontend/src/document-center/editor/tableContextToolbar.test.mjs`
- Modify: `frontend/src/document-center/editor/editorShellUi.test.mjs`

**Interfaces:**
- Consumes: `TableSizePicker`。
- Produces: `insertTable({ rows, cols, withHeaderRow: true })` 调用。

- [ ] **Step 1: 更新测试为目标行为**：工具栏仅有“单元格、表格”；块工具箱不含插入/删除行列；表格插入入口挂载 `TableSizePicker`。
- [ ] **Step 2: 运行测试确认旧实现失败**。
- [ ] **Step 3: 点击“表格”打开尺寸选择器**：保存当前插入位置，确认尺寸后聚焦编辑器并调用 Tiptap `insertTable`。
- [ ] **Step 4: 移除两个行列菜单和块工具箱中的行列操作**：保留边缘 `+`、选择句柄和红色删除按钮。
- [ ] **Step 5: 重跑相关测试并确认通过**。

### Task 3: 整表选择与键盘删除

**Files:**
- Create: `frontend/src/document-center/editor/TableKeyboardExtension.ts`
- Create: `frontend/src/document-center/editor/TableKeyboardExtension.test.ts`
- Modify: `frontend/src/document-center/editor/documentExtensions.ts`
- Modify: `frontend/src/document-center/editor/BlockContextToolbar.tsx`
- Modify: `frontend/src/document-center/editor/tableContextModel.ts`
- Modify: `frontend/src/document-center/editor/tableContextModel.test.ts`

**Interfaces:**
- Produces: `TableKeyboardExtension`。
- Consumes: 表格节点 `NodeSelection`。

- [ ] **Step 1: 写失败测试**：整表 `NodeSelection` 下 Backspace/Delete 删除表格；TextSelection 和 CellSelection 不触发扩展删除。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现键盘扩展**：使用 `addKeyboardShortcuts`，检查 `selection instanceof NodeSelection && selection.node.type.name === 'table'` 后执行 `deleteSelection`。
- [ ] **Step 4: 块句柄建立整表选择**：表格句柄打开菜单时执行 `setNodeSelection(target.pos)`；让表格上下文解析兼容该选择。
- [ ] **Step 5: 注册扩展并重跑定向测试**。

### Task 4: 完整验证

**Files:**
- Verify: `frontend/src/document-center/editor/TableSizePicker.tsx`
- Verify: `frontend/src/document-center/editor/TableContextToolbar.tsx`
- Verify: `frontend/src/document-center/editor/TableKeyboardExtension.ts`
- Verify: `frontend/src/document-center/editor/BlockContextToolbar.tsx`

- [ ] **Step 1: 运行全部 TypeScript 测试**：`pnpm exec tsx --test $(rg --files src | rg '\.test\.ts$')`。
- [ ] **Step 2: 运行全部静态 UI 测试**：`node --test $(rg --files src | rg '\.test\.mjs$')`。
- [ ] **Step 3: 运行类型检查和构建**：`pnpm typecheck && pnpm build`。
- [ ] **Step 4: 运行差异检查**：`git diff --check`。
- [ ] **Step 5: 浏览器非破坏性验证**：打开插入面板检查 5×5 拖选和数字输入；选中现有表格确认工具栏无行列菜单；在临时新表格上验证 Delete 后立即撤销，避免修改现有文档内容。
