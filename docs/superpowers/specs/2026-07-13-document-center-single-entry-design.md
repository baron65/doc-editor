# 文档中心单页入口合并设计

- 日期：2026-07-13
- 状态：已确认
- 范围：用户端文档中心、管理端文档管理

## 1. 背景与目标

用户端和管理端目前均拆分为 `index.tsx` 与 `detail.tsx` 两个页面入口，导致布局、文档树请求和选中逻辑重复。管理端更出现了职责割裂：列表页可管理文档树，详情页可编辑文档，但编辑时不能完整调整文档树。

本次合并后：

- 用户端只保留 `pages/document-center/index.tsx` 一个页面实现。
- 管理端只保留 `pages/admin/document-center/index.tsx` 一个页面实现。
- 删除两个 `detail.tsx`。
- 保留现有带文档 ID 的 URL，兼容刷新、收藏、复制链接和旧链接。

## 2. 路由设计

Umi Max 4 不支持可选动态路由参数，因此每个模块保留两条 URL 匹配规则，但它们指向同一个页面组件：

```text
/document-center                    -> ./document-center/index
/document-center/:documentId        -> ./document-center/index
/admin/document-center              -> ./admin/document-center/index
/admin/document-center/:documentId  -> ./admin/document-center/index
```

这里的“单入口”指单一页面组件和单一状态流，不破坏现有 URL 语义。

## 3. 用户端单页工作台

`pages/document-center/index.tsx` 同时承担文档树与正文阅读：

1. 请求已发布文档树。
2. URL 含 `documentId` 时请求对应文档。
3. URL 不含 `documentId` 时，自动选择默认文档并使用 `history.replace` 进入带 ID 的 URL。
4. 点击文档树中的文档时仅更新 URL，同一页面内刷新正文、上一篇和下一篇导航。
5. 文档不存在或已下架时，在正文区显示错误态，文档树仍可操作。

## 4. 管理端单页工作台

`pages/admin/document-center/index.tsx` 同时承担文档树管理和文档编辑。

### 4.1 状态分离

页面必须区分两个状态：

- `selectedTreeNode`：当前在文档树中选中的目录或文档，用于新建、重命名、删除、排序和移动。
- `activeDocumentId`：当前右侧编辑器打开的文档，由 URL 决定。

点击目录时只更新 `selectedTreeNode`，右侧编辑器继续保持当前文档；点击文档时同时选中节点并更新 URL。

### 4.2 文档树能力

合并页必须保留原管理首页全部能力：

- 新建文档和新建目录。
- 重命名目录。
- 删除空目录和未发布草稿。
- 节点上移、下移。
- 节点跨目录移动。
- 拖拽排序与拖拽移动。
- 标题搜索与发布状态展示。

新建文档成功后自动导航到新文档；删除当前草稿后打开剩余第一篇文档，无文档时保留管理工作台空态。

### 4.3 编辑安全

从当前文档切换到另一篇文档前，继续使用现有未保存内容确认弹窗。点击目录、调整文档树或刷新文档树不得卸载当前编辑器。

## 5. 数据与刷新规则

- 每个单页工作台只发起一份文档树请求。
- 详情请求仅在 `documentId` 变化时重新执行。
- 发布、下架、保存后刷新同一份管理树，保证状态标签及时更新。
- 目录变更成功后刷新树并保留当前编辑文档。
- 文档树修订冲突继续显示后端返回的明确错误。

## 6. 文件变更

- 合并用户端 `index.tsx` 与 `detail.tsx`，删除 `pages/document-center/detail.tsx`。
- 合并管理端 `index.tsx` 与 `detail.tsx`，删除 `pages/admin/document-center/detail.tsx`。
- 修改 `frontend/config/config.ts`，使根路径和带 ID 路径指向各自的 `index.tsx`。
- 不修改后端 API 和数据结构。

## 7. 验收标准

1. 两个页面目录均只剩一个 `index.tsx` 页面入口。
2. 原四个 URL 均可访问，带 ID 链接刷新后仍打开同一篇文档。
3. 用户端可在同一页面内切换文档、阅读正文和使用上下篇导航。
4. 管理端编辑文档时可同时完成所有目录树管理操作。
5. 点击目录不会丢失或切换右侧文档。
6. 切换文档时仍受未保存内容确认保护。
7. 新建、重命名、删除、上下移、跨目录移动和拖拽均能成功并立即刷新树。
8. 现有前端测试、TypeScript 检查和构建通过。
