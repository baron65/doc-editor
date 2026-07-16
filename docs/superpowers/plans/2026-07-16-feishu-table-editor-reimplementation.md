# Feishu-style Table Editor Reimplementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current menu-heavy table controls with a Feishu-style table editor that exposes visual row/column rails, contextual icon formatting, precise insertion, resizing, headers, and cell merging.

**Architecture:** Keep the Tiptap 3 table schema and commands as the document model, but split UI behavior into a pure table interaction model and focused React controls. `TableContextToolbar` becomes an icon-only contextual toolbar; table rails own row/column selection and boundary insertion; Tiptap's table plugin continues to own column resizing and cell selection.

**Tech Stack:** React 18, TypeScript 4.9, Tiptap 3.27.3, ProseMirror tables, Tailwind CSS 3.4, Node test runner.

## Global Constraints

- Do not add a second table schema or change persisted table JSON.
- Reuse Tiptap commands for add/delete row or column, merge/split, header row, and table deletion.
- Keep table row/column operations out of the generic block toolbar.
- Use icon-only contextual actions with accessible labels and tooltips.
- Header cells use a visible default background and bold text in editor and reader.
- Preserve existing autosave and document publication behavior.

---

### Task 1: Table interaction state and geometry

**Files:**
- Modify: `frontend/src/document-center/editor/tableContextModel.ts`
- Modify: `frontend/src/document-center/editor/tableContextModel.test.ts`

**Interfaces:**
- Consumes: Tiptap `Editor`, ProseMirror `CellSelection`, `NodeSelection`, and `TableMap`.
- Produces: `TableContextState`, `selectTableRow`, `selectTableColumn`, and geometry helpers used by the rail UI.

- [x] **Step 1: Write failing tests** for row/column selection, active selection type, and insertion boundaries.
- [x] **Step 2: Run** `node --test src/document-center/editor/tableContextModel.test.ts` and confirm failures describe missing state/geometry.
- [x] **Step 3: Implement** selection metadata and normalized rail segments without modifying the document.
- [x] **Step 4: Re-run the test** and confirm all table context model cases pass.

### Task 2: Feishu-style contextual toolbar

**Files:**
- Modify: `frontend/src/document-center/editor/TableContextToolbar.tsx`
- Modify: `frontend/src/document-center/editor/tableContextToolbar.test.mjs`
- Modify: `frontend/src/global.css`

**Interfaces:**
- Consumes: `TableContextState`, current Tiptap selection, existing text formatting commands, and the shared delete confirmation callback.
- Produces: icon-only table toolbar supporting header row, merge/split, text style, alignment, colors, and destructive actions.

- [x] **Step 1: Write failing tests** requiring icon-only controls, accessible tooltips, context-sensitive merge/header actions, and no legacy row/column dropdown groups.
- [x] **Step 2: Run** `node --test src/document-center/editor/tableContextToolbar.test.mjs` and confirm it fails against the legacy toolbar.
- [x] **Step 3: Replace** grouped text menus with a horizontal icon toolbar positioned next to the active row/column/cell selection.
- [x] **Step 4: Add** palettes for text/background color and keep formatting commands applied to the entire `CellSelection`.
- [x] **Step 5: Re-run the toolbar tests** and confirm all cases pass.

### Task 3: Row/column rails, boundary insertion, and visual states

**Files:**
- Modify: `frontend/src/document-center/editor/TableContextToolbar.tsx`
- Modify: `frontend/src/global.css`
- Modify: `frontend/src/document-center/editor/tableContextToolbar.test.mjs`

**Interfaces:**
- Consumes: DOM row/column rectangles and selection state from Tasks 1–2.
- Produces: top column rail, left row rail, hover boundary `+` controls, selected row/column fill, and resize affordances.

- [x] **Step 1: Write failing source/UI tests** for continuous rails, hover-only insertion handles, active segment styling, and resize cursor styling.
- [x] **Step 2: Run the tests** and verify the legacy individual floating buttons fail the expectations.
- [x] **Step 3: Render** rail segments aligned to actual table cells, including merged-cell spans.
- [x] **Step 4: Style** the rails, blue insertion line, blue plus button, selected-cell fill, header fill, borders, and toolbar shadows to match the supplied Feishu references.
- [x] **Step 5: Re-run tests** and confirm the rail behavior and style contracts pass.

### Task 4: Table insertion picker and end-to-end verification

**Files:**
- Modify: `frontend/src/document-center/editor/TableSizePicker.tsx`
- Modify: `frontend/src/document-center/editor/tableSizePickerUi.test.mjs`
- Modify: `frontend/src/global.css`

**Interfaces:**
- Consumes: existing `onInsert(rows, columns)` callback.
- Produces: pointer-drag dimension selection with a live `rows × columns` preview and header-row default.

- [x] **Step 1: Write failing tests** for pointer-down/drag/pointer-up selection and cancelling without insertion.
- [x] **Step 2: Run** `node --test src/document-center/editor/tableSizePickerUi.test.mjs` and confirm failure against hover/click-only behavior.
- [x] **Step 3: Implement** pointer capture and drag selection while keeping keyboard-accessible numeric inputs.
- [x] **Step 4: Run** all table tests and `pnpm typecheck`.
- [x] **Step 5: Open** the existing admin document page and non-destructively verify the rails, row selection, formatting toolbar capability state, and column resize handle; cover insert/delete/header/merge commands with automated tests.
