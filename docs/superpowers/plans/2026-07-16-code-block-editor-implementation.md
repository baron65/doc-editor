# Code Block Editor Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为管理端 Tiptap 代码块增加可搜索语言选择、自动换行和复制操作，并让语言属性在编辑、保存、预览和用户端之间保持一致。

**Architecture:** 使用自定义 `CodeBlock` React NodeView 包裹 Tiptap 的可编辑代码内容，工具栏通过 `updateAttributes` 回写节点语言。语言定义和别名规范化放在共享模块中，编辑态与静态阅读器共同使用；自动换行仅保存在 NodeView 本地状态。

**Tech Stack:** React 18、TypeScript 4.9.5、Tiptap 3.27.3、Tailwind CSS 3.4.17、highlight.js 11.11.1、Node test runner

## Global Constraints

- 本次仅实现语言选择、语言搜索、自动换行和复制。
- 不实现行号、代码块折叠、代码执行、代码格式化或语言服务。
- 文档 JSON 仅保存稳定的 `codeBlock.attrs.language`；自动换行不持久化。
- Mermaid 继续使用独立 Mermaid 节点，不作为普通代码块语言选项。
- 未识别语言保留原始属性，并在阅读端按纯文本展示。
- 前端交互不得使用 `window.prompt` 或 `window.confirm`。

---

### Task 1: 共享代码语言目录

**Files:**
- Create: `frontend/src/document-center/code/codeLanguages.ts`
- Create: `frontend/src/document-center/code/codeLanguages.test.ts`
- Modify: `frontend/src/document-center/reader/CodeBlock.tsx`

**Interfaces:**
- Produces: `CODE_LANGUAGES: readonly CodeLanguage[]`
- Produces: `normalizeCodeLanguage(value?: string): string`
- Produces: `findCodeLanguage(value?: string): CodeLanguage | undefined`
- Produces: `filterCodeLanguages(query: string): CodeLanguage[]`
- Consumes: `CodeBlock` 阅读器现有 highlight.js 注册语言。

- [ ] **Step 1: 编写语言规范化和搜索失败测试**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterCodeLanguages,
  findCodeLanguage,
  normalizeCodeLanguage,
} from './codeLanguages';

test('代码语言别名规范化为稳定值', () => {
  assert.equal(normalizeCodeLanguage('JS'), 'javascript');
  assert.equal(normalizeCodeLanguage(' shell '), 'bash');
  assert.equal(normalizeCodeLanguage(), 'plaintext');
});

test('语言搜索匹配名称和值和别名', () => {
  assert.deepEqual(filterCodeLanguages('py').map((item) => item.value), ['python']);
  assert.equal(findCodeLanguage('ts')?.label, 'TypeScript');
});

test('未知语言保留规范化后的原始值', () => {
  assert.equal(normalizeCodeLanguage('Kotlin'), 'kotlin');
  assert.equal(findCodeLanguage('kotlin'), undefined);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd frontend && pnpm exec tsx --test src/document-center/code/codeLanguages.test.ts`

Expected: FAIL，提示找不到 `./codeLanguages`。

- [ ] **Step 3: 实现共享语言目录和查询函数**

```ts
export interface CodeLanguage {
  value: string;
  label: string;
  aliases: readonly string[];
}

export const CODE_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text', aliases: ['text', 'txt'] },
  { value: 'bash', label: 'Bash', aliases: ['shell', 'sh'] },
  { value: 'css', label: 'CSS', aliases: [] },
  { value: 'xml', label: 'HTML / XML', aliases: ['html'] },
  { value: 'java', label: 'Java', aliases: [] },
  { value: 'javascript', label: 'JavaScript', aliases: ['js'] },
  { value: 'json', label: 'JSON', aliases: [] },
  { value: 'markdown', label: 'Markdown', aliases: ['md'] },
  { value: 'python', label: 'Python', aliases: ['py'] },
  { value: 'sql', label: 'SQL', aliases: [] },
  { value: 'typescript', label: 'TypeScript', aliases: ['ts'] },
  { value: 'yaml', label: 'YAML', aliases: ['yml'] },
] as const satisfies readonly CodeLanguage[];

const aliasToValue = new Map(
  CODE_LANGUAGES.flatMap((item) => [item.value, ...item.aliases].map((alias) => [alias, item.value] as const)),
);

export function normalizeCodeLanguage(value?: string) {
  const normalized = value?.trim().toLowerCase() || 'plaintext';
  return aliasToValue.get(normalized) ?? normalized;
}

export function findCodeLanguage(value?: string) {
  const normalized = normalizeCodeLanguage(value);
  return CODE_LANGUAGES.find((item) => item.value === normalized);
}

export function filterCodeLanguages(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...CODE_LANGUAGES];
  return CODE_LANGUAGES.filter((item) =>
    [item.value, item.label, ...item.aliases].some((candidate) => candidate.toLowerCase().includes(normalized)),
  );
}
```

- [ ] **Step 4: 让阅读器复用语言规范化函数并运行测试**

从 `CodeBlock.tsx` 删除本地 `aliases` 和 `normalizeLanguage`，改为：

```ts
import { normalizeCodeLanguage } from '../code/codeLanguages';

const normalizedLanguage = normalizeCodeLanguage(language);
```

Run: `cd frontend && pnpm exec tsx --test src/document-center/code/codeLanguages.test.ts src/document-center/reader/DocumentReader.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交语言目录**

```bash
git add frontend/src/document-center/code frontend/src/document-center/reader/CodeBlock.tsx
git commit -m "feat: share code block language catalog"
```

### Task 2: 代码块 React NodeView

**Files:**
- Create: `frontend/src/document-center/code/CodeBlockNodeView.tsx`
- Create: `frontend/src/document-center/code/CodeBlockNodeView.test.mjs`
- Create: `frontend/src/document-center/code/CodeBlockExtension.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/pnpm-lock.yaml`

**Interfaces:**
- Consumes: `CODE_LANGUAGES`, `filterCodeLanguages`, `findCodeLanguage`, `normalizeCodeLanguage`。
- Produces: `CodeBlockExtension`，Tiptap 扩展名必须为 `codeBlock`。
- Produces: NodeView 通过 `updateAttributes({ language })` 更新节点属性。

- [ ] **Step 1: 添加直接依赖并编写 NodeView 静态交互测试**

Run: `cd frontend && pnpm add @tiptap/extension-code-block@3.27.3`

创建测试，验证关键交互不会回退成插入弹框：

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CodeBlockNodeView.tsx', import.meta.url), 'utf8');

test('代码块节点提供语言搜索、换行和复制操作', () => {
  assert.match(source, /updateAttributes\(\{ language/);
  assert.match(source, /placeholder="搜索语言"/);
  assert.match(source, /自动换行/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /contentEditable=\{false\}/);
  assert.match(source, /<NodeViewContent/);
});
```

- [ ] **Step 2: 运行静态测试并确认失败**

Run: `cd frontend && node --test src/document-center/code/CodeBlockNodeView.test.mjs`

Expected: FAIL，提示找不到 `CodeBlockNodeView.tsx`。

- [ ] **Step 3: 实现 CodeBlock NodeView**

组件状态与核心行为：

```tsx
const [menuOpen, setMenuOpen] = useState(false);
const [query, setQuery] = useState('');
const [wrap, setWrap] = useState(false);
const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
const language = normalizeCodeLanguage(String(node.attrs.language ?? 'plaintext'));
const languageMeta = findCodeLanguage(language);
const options = filterCodeLanguages(query);

const selectLanguage = (nextLanguage: string) => {
  updateAttributes({ language: nextLanguage });
  setMenuOpen(false);
  setQuery('');
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(node.textContent);
    setCopyState('copied');
  } catch {
    setCopyState('failed');
  }
  window.setTimeout(() => setCopyState('idle'), 1600);
};
```

渲染时使用 `NodeViewWrapper`、不可编辑 header、可搜索列表和：

```tsx
<NodeViewContent
  as="pre"
  className={wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto whitespace-pre'}
/>
```

菜单必须支持点击外部和 Escape 关闭，未知语言标题使用原始语言值。

- [ ] **Step 4: 实现 CodeBlockExtension**

```ts
import CodeBlock from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockNodeView } from './CodeBlockNodeView';

export const CodeBlockExtension = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
}).configure({
  defaultLanguage: 'plaintext',
});
```

- [ ] **Step 5: 运行 NodeView 测试与类型检查**

Run: `cd frontend && node --test src/document-center/code/CodeBlockNodeView.test.mjs && pnpm typecheck`

Expected: PASS，TypeScript 无错误。

- [ ] **Step 6: 提交 NodeView**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/document-center/code
git commit -m "feat: add interactive code block node view"
```

### Task 3: 编辑器接入与插入流程

**Files:**
- Modify: `frontend/src/document-center/editor/documentSchemaExtensions.ts`
- Modify: `frontend/src/document-center/editor/DocumentEditorShell.tsx`
- Modify: `frontend/src/document-center/editor/documentExtensions.test.ts`
- Modify: `frontend/src/document-center/editor/editorShellUi.test.mjs`

**Interfaces:**
- Consumes: `CodeBlockExtension`。
- Produces: `createDocumentSchemaExtensions()` 中唯一的 `codeBlock` 扩展。
- Produces: 新代码块默认 `language: 'plaintext'`，不再弹出语言输入框。

- [ ] **Step 1: 编写失败测试**

为 `documentExtensions.test.ts` 增加：

```ts
test('代码块使用自定义 NodeView 且扩展名称唯一', () => {
  const extensions = createDocumentExtensions().flatMap((extension) =>
    'extensions' in extension && Array.isArray(extension.extensions) ? extension.extensions : [extension],
  );
  assert.equal(extensions.filter((extension) => extension.name === 'codeBlock').length, 1);
});
```

为 `editorShellUi.test.mjs` 增加：

```js
test('插入代码块默认使用纯文本且不要求输入语言', () => {
  assert.match(editorSource, /setCodeBlock\(\{ language: 'plaintext' \}\)/);
  assert.doesNotMatch(editorSource, /title: '插入代码块'/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd frontend && pnpm exec tsx --test src/document-center/editor/documentExtensions.test.ts && node --test src/document-center/editor/editorShellUi.test.mjs`

Expected: 至少一个断言 FAIL。

- [ ] **Step 3: 接入扩展并简化插入动作**

在 StarterKit 中关闭默认代码块并加入自定义扩展：

```ts
StarterKit.configure({
  codeBlock: false,
  heading: { levels: [1, 2, 3, 4, 5] },
  link: { autolink: true, openOnClick: false },
}),
CodeBlockExtension,
```

将插入逻辑改为同步操作：

```ts
const insertCodeBlock = (position: number) => {
  if (!editor) return;
  editor.chain().focus().setTextSelection(position).setCodeBlock({ language: 'plaintext' }).run();
};
```

- [ ] **Step 4: 运行编辑器测试**

Run: `cd frontend && pnpm exec tsx --test src/document-center/editor/documentExtensions.test.ts && node --test src/document-center/editor/editorShellUi.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交编辑器接入**

```bash
git add frontend/src/document-center/editor
git commit -m "feat: integrate code block node view"
```

### Task 4: 样式、回归与浏览器验收

**Files:**
- Modify: `frontend/src/global.css`
- Modify: `frontend/src/document-center/reader/readerLayout.test.mjs`

**Interfaces:**
- Consumes: NodeView 语义类名和现有 `.document-editor` 样式。
- Produces: 编辑态代码块工具栏、菜单和正文的最终视觉样式。

- [ ] **Step 1: 编写样式失败测试**

在 `readerLayout.test.mjs` 中读取 NodeView 和全局样式并断言：

```js
assert.match(globalStyles, /\.document-code-block/);
assert.match(globalStyles, /\.document-code-block-menu/);
assert.match(globalStyles, /\.document-code-block-content/);
assert.match(codeBlockNodeViewSource, /aria-label="选择代码语言"/);
assert.match(codeBlockNodeViewSource, /aria-pressed=\{wrap\}/);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd frontend && node --test src/document-center/reader/readerLayout.test.mjs`

Expected: FAIL，缺少代码块样式。

- [ ] **Step 3: 增加作用域样式**

样式必须限定在 `.document-editor` 下，覆盖以下行为：

```css
.document-editor .document-code-block { position: relative; overflow: visible; }
.document-editor .document-code-block-content { margin: 0; min-height: 3rem; }
.document-editor .document-code-block-menu { max-height: 20rem; overflow-y: auto; }
.document-editor .document-code-block-content.whitespace-pre { overflow-x: auto; }
```

同时确保全局 `.document-body pre` 不覆盖 NodeView header 和菜单。

- [ ] **Step 4: 运行全部相关测试、类型检查和构建**

Run:

```bash
cd frontend
pnpm exec tsx --test src/document-center/code/codeLanguages.test.ts src/document-center/editor/documentExtensions.test.ts src/document-center/reader/DocumentReader.test.tsx
node --test src/document-center/code/CodeBlockNodeView.test.mjs src/document-center/editor/editorShellUi.test.mjs src/document-center/reader/readerLayout.test.mjs
pnpm typecheck
pnpm build
```

Expected: 所有测试 PASS，类型检查和生产构建退出码为 0。

- [ ] **Step 5: 在浏览器完成交互验收**

打开管理端包含代码块的文档并验证：

1. 当前语言显示正确。
2. 输入 `sql`、`js`、`py` 均能搜索到对应语言。
3. 切换语言后自动保存成功，刷新页面仍保持该语言。
4. 自动换行开关即时改变长行布局，不改变文档 JSON。
5. 复制按钮复制完整代码并显示“已复制”。
6. 点击代码正文仍可编辑，撤销和重做正常。
7. 用户视角预览与用户端按选择后的语言高亮。

- [ ] **Step 6: 提交样式和验证调整**

```bash
git add frontend/src/global.css frontend/src/document-center/reader/readerLayout.test.mjs
git commit -m "style: finish code block editor controls"
```
