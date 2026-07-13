# Document Center Single-Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the user and admin document center index/detail page pairs into one page implementation per module while preserving existing deep-link URLs and all tree-management/editor behavior.

**Architecture:** Keep two URL patterns per module because Umi Max 4 does not support optional dynamic parameters, but point both patterns to the same `index.tsx`. The admin page owns one tree request and separates `selectedTreeNode` from the URL-derived `activeDocumentId`; the user page owns one published-tree request and loads the URL-derived document in the same component.

**Tech Stack:** React, TypeScript 4.9.5, `@umijs/max` 4.5.3, Umi route configuration, Node test runner.

## Global Constraints

- Preserve `/document-center/:documentId` and `/admin/document-center/:documentId` deep links.
- Keep all existing backend APIs and response types unchanged.
- Keep the admin unsaved-editor navigation guard.
- Clicking a directory changes tree selection without changing or unmounting the active editor.
- Preserve create, rename, delete, reorder, cross-directory move, drag-and-drop, search, and publish-state display.
- Do not stage or commit because the shared worktree contains unrelated user changes.

---

### Task 1: Lock the single-entry route contract with a failing test

**Files:**
- Create: `frontend/src/document-center/singleEntryPages.test.mjs`
- Modify: `frontend/config/config.ts`

**Interfaces:**
- Consumes: Umi route records in `frontend/config/config.ts`.
- Produces: both URL patterns for each module resolve to one `index.tsx`; the two `detail.tsx` files no longer exist.

- [ ] **Step 1: Write the failing architecture test**

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync(new URL('../../config/config.ts', import.meta.url), 'utf8');

test('用户端和管理端分别只有一个页面入口', () => {
  assert.match(routes, /path: '\/document-center\/:documentId', component: '\.\/document-center\/index'/);
  assert.match(routes, /path: '\/admin\/document-center\/:documentId', component: '\.\/admin\/document-center\/index'/);
  assert.equal(existsSync(new URL('../pages/document-center/detail.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../pages/admin/document-center/detail.tsx', import.meta.url)), false);
});
```

- [ ] **Step 2: Run the test and verify the current split fails**

Run: `cd frontend && node --test src/document-center/singleEntryPages.test.mjs`

Expected: FAIL because the ID routes point to `detail` and both detail files still exist.

- [ ] **Step 3: Point both deep-link routes to the index components**

```ts
{ path: '/document-center', component: './document-center/index' },
{ path: '/document-center/:documentId', component: './document-center/index' },
{ path: '/admin/document-center', component: './admin/document-center/index' },
{ path: '/admin/document-center/:documentId', component: './admin/document-center/index' },
```

- [ ] **Step 4: Leave file deletion until Tasks 2 and 3 have moved the behavior**

Run: `cd frontend && node --test src/document-center/singleEntryPages.test.mjs`

Expected: still FAIL only on the two existing detail files; route assertions pass.

---

### Task 2: Merge the user reader into its index page

**Files:**
- Modify: `frontend/src/pages/document-center/index.tsx`
- Delete: `frontend/src/pages/document-center/detail.tsx`
- Test: `frontend/src/document-center/singleEntryPages.test.mjs`

**Interfaces:**
- Consumes: `getPublishedTree`, `getPublishedDocument`, `getDocumentNavigation`, `ResponsiveDocumentTree`, `DocumentReader`, and optional `useParams().documentId`.
- Produces: `DocumentCenterPage` serving both root and ID paths.

- [ ] **Step 1: Extend the failing test with user-page responsibilities**

```js
const userPage = readFileSync(new URL('../pages/document-center/index.tsx', import.meta.url), 'utf8');
assert.match(userPage, /useParams/);
assert.match(userPage, /getPublishedDocument/);
assert.match(userPage, /<DocumentReader/);
assert.match(userPage, /getDocumentNavigation/);
```

- [ ] **Step 2: Run the focused test and verify it fails on the old index placeholder**

Run: `cd frontend && node --test src/document-center/singleEntryPages.test.mjs`

Expected: FAIL because the old index page only redirects and renders a placeholder.

- [ ] **Step 3: Merge the reader data flow into `index.tsx`**

Implement these exact states:

```ts
const { documentId = '' } = useParams();
const treeRequest = useRequest(getPublishedTree, { formatResult: passthroughRequestResult });
const detailRequest = useRequest(
  () => documentId ? getPublishedDocument(documentId) : Promise.resolve(undefined),
  { formatResult: passthroughRequestResult, refreshDeps: [documentId], ready: Boolean(documentId) },
);
```

Keep the existing root-path effect that replaces the URL with `tree.defaultDocumentId`. Compute previous/next navigation from the same tree request and render the existing error state without replacing the tree.

- [ ] **Step 4: Delete the user `detail.tsx` after all behavior is present in `index.tsx`**

- [ ] **Step 5: Run the focused test**

Run: `cd frontend && node --test src/document-center/singleEntryPages.test.mjs`

Expected: user-page assertions pass; admin detail-file assertion still fails until Task 3.

---

### Task 3: Merge full admin tree management and editor into one index page

**Files:**
- Modify: `frontend/src/pages/admin/document-center/index.tsx`
- Delete: `frontend/src/pages/admin/document-center/detail.tsx`
- Modify: `frontend/src/document-center/editor/editorShellUi.test.mjs`
- Modify: `frontend/src/document-center/tree/documentTreePanelUi.test.mjs`
- Modify: `frontend/src/components/app-dialog/AppDialog.test.mjs`
- Test: `frontend/src/document-center/singleEntryPages.test.mjs`

**Interfaces:**
- Consumes: all existing admin index tree-management handlers, `getAdminDocument`, `DocumentEditorShell`, `shouldConfirmEditorNavigation`, and the common dialog.
- Produces: `AdminDocumentCenterPage` serving both root and ID paths with one tree request and one detail request.

- [ ] **Step 1: Update source-contract tests to target only the admin index page**

Replace reads of `pages/admin/document-center/detail.tsx` with `pages/admin/document-center/index.tsx`. Add assertions that the single page contains:

```js
assert.match(adminPage, /getAdminDocument/);
assert.match(adminPage, /<DocumentEditorShell/);
assert.match(adminPage, /onDocumentChange=\{treeRequest\.refresh\}/);
assert.match(adminPage, /handleCreateSubmit/);
assert.match(adminPage, /handleRenameDirectory/);
assert.match(adminPage, /handleMoveSelected/);
assert.match(adminPage, /handleTreeDrop/);
```

- [ ] **Step 2: Run the affected tests and verify they fail before the merge**

Run: `cd frontend && node --test src/components/app-dialog/AppDialog.test.mjs src/document-center/editor/editorShellUi.test.mjs src/document-center/tree/documentTreePanelUi.test.mjs src/document-center/singleEntryPages.test.mjs`

Expected: FAIL because the editor and delete-draft behavior still live in `detail.tsx`.

- [ ] **Step 3: Add URL-derived editor state and the detail request to the admin index**

```ts
const { documentId = '' } = useParams();
const detailRequest = useRequest(
  () => documentId ? getAdminDocument(documentId) : Promise.resolve(undefined),
  { formatResult: passthroughRequestResult, refreshDeps: [documentId], ready: Boolean(documentId) },
);
const activeDocument = detailRequest.data as AdminDocumentDetail | undefined;
```

Initialize `selectedTreeNode` from the active tree node only when the URL document changes; do not overwrite a directory selection during unrelated tree refreshes.

- [ ] **Step 4: Keep directory selection independent from editor navigation**

Implement the selection contract:

```ts
const handleSelectNode = async (node: DocumentTreeNode) => {
  if (node.nodeType !== 'DOCUMENT') {
    setSelectedNode(node);
    setMoveTargetParentId(node.parentId);
    return;
  }
  if (shouldConfirmEditorNavigation(hasPendingEditorWork, documentId, node.id)
      && !await confirm({
        title: '离开当前文档？',
        description: '当前文档仍有未保存、保存失败或冲突内容，离开后这些内容可能丢失。',
        confirmText: '确认离开',
        danger: true,
      })) return;
  setSelectedNode(node);
  setMoveTargetParentId(node.parentId);
  history.push(`/admin/document-center/${node.id}`);
};
```

Because document selection is changed only after confirmation succeeds, cancelling navigation leaves both the selected node and editor unchanged.

- [ ] **Step 5: Reconcile deletion behavior**

Use the general selected-node delete action for directories and documents. For a draft row trash action, call the same delete helper. When the deleted node is the active document, navigate to the first remaining document or `/admin/document-center`; otherwise retain the current editor.

- [ ] **Step 6: Render the existing `DocumentEditorShell` in the right pane**

```tsx
<section className="min-w-0 flex-1">
  {detailRequest.loading ? (
    <div className="p-8 text-sm text-gray-500">加载中...</div>
  ) : (
    <DocumentEditorShell
      document={activeDocument}
      onDocumentChange={treeRequest.refresh}
      onPendingChange={setHasPendingEditorWork}
    />
  )}
</section>
```

Keep the existing sticky full-management sidebar and pass both `activeDocumentId={documentId}` and `activeNodeId={selectedNode?.id}` to `DocumentTreePanel`.

- [ ] **Step 7: Add root-path default-document navigation**

After the tree loads, if no `documentId` exists, replace the URL with the first document ID from `flattenTreeNodes`. Keep the workspace empty state when the tree has no documents.

- [ ] **Step 8: Delete the admin `detail.tsx` and run affected tests**

Run: `cd frontend && node --test src/components/app-dialog/AppDialog.test.mjs src/document-center/editor/editorShellUi.test.mjs src/document-center/tree/documentTreePanelUi.test.mjs src/document-center/singleEntryPages.test.mjs`

Expected: all affected tests PASS.

---

### Task 4: Verify the consolidated workspace

**Files:**
- Verify all modified frontend files.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: buildable, type-safe single-entry document centers.

- [ ] **Step 1: Run all lightweight frontend tests**

Run: `cd frontend && node --test src/components/**/*.test.mjs src/document-center/**/*.test.mjs`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the TypeScript compiler**

Run: `cd frontend && pnpm typecheck`

Expected: exit code 0.

- [ ] **Step 3: Build the Umi application**

Run: `cd frontend && pnpm build`

Expected: Webpack compilation succeeds and `dist/index.html` is generated.

- [ ] **Step 4: Check patch integrity and page-entry count**

Run: `git diff --check`

Expected: exit code 0.

Run: `find frontend/src/pages/document-center frontend/src/pages/admin/document-center -maxdepth 1 -type f -print`

Expected: only one `index.tsx` file in each page directory.
