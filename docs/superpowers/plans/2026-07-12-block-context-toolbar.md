# Block Context Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the permanent editor toolbar with a Feishu-style block handle menu and text-selection bubble menu.

**Architecture:** Keep block detection and presentation in a pure model, render interaction in a focused `BlockContextToolbar` component, and let `DocumentEditorShell` retain upload and document lifecycle ownership. Use existing Tiptap commands and callbacks without new dependencies.

**Tech Stack:** React 18.2, TypeScript 4.9.5, Tiptap 3.27.3, Umi Max 4.5.3, Tailwind 3.4.17.

## Global Constraints

- Do not add comments, sharing, translation, templates, or collaboration actions.
- Do not add drag sorting in this iteration.
- Preserve all currently available formatting, insertion, table, image, attachment, callout, and Mermaid actions.

---

### Task 1: Block presentation model

**Files:** Create `frontend/src/document-center/editor/blockContextModel.ts`; test `blockContextModel.test.ts`.

- [x] Write failing tests for empty paragraph, H1～H5, top-level block positions, and per-list-item positions.
- [x] Implement `getBlockHandlePresentation(nodeType, empty, attrs)` and precise block target resolution.
- [x] Run model tests.

### Task 2: Block and selection menus

**Files:** Create `frontend/src/document-center/editor/BlockContextToolbar.tsx`; modify `DocumentEditorShell.tsx`.

- [x] Write a failing source regression test for block toolbar and selection-menu integration.
- [x] Implement coordinate-based block detection, per-list-item positioning, target selection, menu open/close, and block actions.
- [x] Add selection actions for selected text.
- [x] Preserve contextual table/image actions through position-aware callbacks.
- [x] Remove the permanent content toolbar while retaining hidden upload inputs.

### Task 3: Layout and verification

**Files:** Modify `frontend/src/global.css`; update editor regression tests.

- [x] Add left gutter and viewport-bounded popup scrolling.
- [x] Run focused tests and TypeScript checking.
- [x] Run Umi production build and inspect the generated CSS/classes.

### Task 4: Compact tools, shortcuts, and node highlight

**Files:** Create `frontend/src/document-center/editor/blockShortcutModel.ts` and its test; modify `BlockContextToolbar.tsx`, `editorShellUi.test.mjs`, and `frontend/src/global.css`.

- [x] Write failing pure-model tests for macOS/Windows shortcut labels and exact modifier matching.
- [x] Write failing UI regression assertions for the five-column compact transform group, shortcut hints, editor-scoped keydown listener, and temporary node highlight class.
- [x] Implement the shortcut registry and platform-aware formatter without adding dependencies.
- [x] Connect every visible block-menu action to an editor-scoped keyboard shortcut.
- [x] Rework the transform group to five columns and keep insertion/context actions as shortcut-labelled rows.
- [x] Add and clean up the target-node highlight decoration while the pointer is over the handle/menu.
- [x] Run focused tests, TypeScript checking, Umi build, and browser interaction verification.

### Task 5: Narrow popup and block formatting operations

**Files:** Create `frontend/src/document-center/editor/BlockFormattingExtension.ts` and model tests; modify `BlockContextToolbar.tsx`, `DocumentReader.tsx`, `DocumentContentAbility.java`, related tests, and `frontend/src/global.css`.

- [x] Write failing frontend tests for safe colors, indentation bounds, popup side selection, duplicate/delete ranges, and Reader rendering.
- [x] Write failing backend tests for accepted alignment/indent/color values and rejected arbitrary style values.
- [x] Implement custom Tiptap attributes and `textStyle` mark without new npm dependencies.
- [x] Implement a 240px popup that prefers the left side of the handle and falls back right only when necessary.
- [x] Replace list/quote/code text glyphs with semantic SVG icons.
- [x] Add alignment/indent and color submenus with safe values.
- [x] Add exact-node duplicate and delete operations with shortcuts.
- [x] Update Reader rendering and backend validation for the new persisted attributes.
- [x] Run frontend/backend tests, TypeScript checking, Umi build, and browser verification.
