# Document Center Frontend

@umijs/max 4.5.3 + TypeScript 4.9.5 + Tailwind CSS 3.4.17 reference frontend.

## Runtime

- Node.js `>=22.13.0`
- pnpm `11.7.0`

## Routes

| Route | Purpose |
|---|---|
| `/document-center` | 用户端文档中心 |
| `/document-center/:documentId` | 用户端文档详情 |
| `/admin/document-center` | 管理端文档树与工作台 |
| `/admin/document-center/:documentId` | 管理端文档编辑页 |

## Run

Recommended local run from repository root:

```bash
cd frontend
DOCUMENT_CENTER_API_PROXY_TARGET=http://localhost:8080 pnpm start
```

The frontend development server proxies `/api/**` to `http://localhost:8080` by default. Override it when the backend runs elsewhere:

```bash
cd frontend
DOCUMENT_CENTER_API_PROXY_TARGET=http://your-host:8080 pnpm start
```

Manual frontend run:

```bash
pnpm install
pnpm start
```

The development proxy sends `/api/**` requests to `DOCUMENT_CENTER_API_PROXY_TARGET`, defaulting to `http://localhost:8080`.

## Editor dependencies

The initial scaffold includes a minimal Tiptap 3 editor baseline:

- `@tiptap/react`
- `@tiptap/core`
- `@tiptap/pm`
- `@tiptap/starter-kit`
- `@tiptap/extension-image`
- `@tiptap/extension-link`
- `@tiptap/extension-underline`
- `mermaid`

Mermaid is locked separately at `10.7.0`. Umi/Webpack needs two compatibility settings in `config/config.ts`: alias `cytoscape/dist/cytoscape.umd.js` to the ESM build, and enable `esbuildMinifyIIFE`.

The published reader currently uses a lightweight local renderer for the Tiptap JSON baseline. It covers paragraphs, headings, lists, blockquotes, code blocks, links, images and Mermaid diagrams. Image nodes prefer `assetId` and read through `/api/v1/document-center/documents/{documentId}/assets/{assetId}`.
