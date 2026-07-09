# Document Publishing Independent Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在真实企业仓库暂不可用的前提下，先基于已确认的后端与前端技术栈搭建独立参考工程，完成文档发布中心的开发基线验证，保证后续迁移到企业内网系统时只需要替换认证、统一响应、存储 SDK、菜单权限、包名前缀和配置等适配层。

**Architecture:** 本计划在当前独立工程内完成基线验证，检查脚手架、依赖闭合、DDL、事务、存储抽象、接口协议与测试门禁；通过后再进入后端、前端和 Reader 的完整功能开发。

**Tech Stack:** Java 11、Spring Boot 2.3.12.RELEASE、Maven、MyBatis-Plus 3.5.1、MySQL/OceanBase MySQL 模式、`DocumentObjectStorage` 抽象（MinIO S3 adapter，企业迁移替换为 `platform-support-storage-v2`）、参考 `CommonResponse<T>`（企业迁移替换为 `platform-support-web-v2`）、@umijs/max 4.5.3、Tailwind 3.4.17、TypeScript 4.9.5、Tiptap 3.x、Mermaid。

## Global Constraints

- 当前默认无法访问真实企业仓库；不得再把“企业仓库接入验证通过”作为启动开发的前置条件。
- 当前项目目标是独立可运行参考实现，不是一次性 Demo；所有包结构、API 路径、响应体、存储接口、审计字段和前端路由都必须服务于后续迁移。
- 不重新打开已确认产品范围：不做多人协作、评论、分享、导出、审批、定时发布、历史版本、回滚、全文检索、文档级权限和外部内容嵌入。
- 后端按 `com.xxx.pai.mlp.man.documentcenter` 搭建参考包名，并按 `client/application/domain/infra` 分包；若真实仓库历史上实际使用 `clinet` 目录名，则沿用现状。Controller、Service、DTO、VO、PO、Mapper 遵循 `{Domain}Controller`、`{Domain}Service`/`{Domain}ServiceImpl`、`{Domain}DTO`、`{Domain}VO`、`{Domain}PO`、`{Domain}Mapper` 命名。
- 后端管理端接口逻辑前缀为 `/api/v1/document-center/admin`，用户端接口逻辑前缀为 `/api/v1/document-center`；前端页面路由可以继续使用系统现有后台菜单路径。
- 正文持久化格式为受控 Tiptap/ProseMirror JSON，API 传输 `schemaVersion` 与 `content` 两个同级字段；不保存 HTML、DOM、永久文件 URL 或任意 CSS class。
- 发布事务只能访问数据库，不能调用对象存储、Mermaid、HTTP 或消息队列。
- 图片和附件通过后端代理单文件上传接入 `DocumentObjectStorage`；默认使用 MinIO S3 adapter，企业迁移后替换为 `platform-support-storage-v2`。
- Mermaid 完整语法只由官方管理端在预览和发布前校验；Java 后端校验节点结构、源码大小、资源归属和安全属性。
- 所有 BIGINT ID、`draftRevision`、`publishedRevision`、`publicationVersion`、`treeRevision` 在 JSON 中序列化为字符串。
- 基线验证输出是证据报告、迁移清单与 Spike 结论；基线通过后才进入完整功能开发。

---

## Output Contract

独立基线验证完成后，当前参考工程中必须新增或更新一份证据报告：

- Create: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`

报告必须包含以下章节，并逐项给出 `PASS`、`FAIL` 或 `BLOCKED`：

1. 仓库与模块定位
2. 后端依赖闭合与测试命令
3. 数据库 DDL 与事务验证
4. 存储抽象上传/读取/删除验证
5. `CommonResponse<T>`、权限、CSRF、ID 和审计接入验证
6. 前端 Umi/Tailwind/TypeScript/Tiptap/Mermaid 构建 Spike
7. E2E 与 CI 门禁
8. 进入完整功能开发的结论

`PASS` 需要附命令、关键输出或截图路径；`FAIL` 需要附失败原因和修复建议；`BLOCKED` 需要附缺失权限、缺失环境或等待对象。

## Task 1: 独立工程与模块定位

**Files:**

- Create: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Read: `pom.xml`
- Read: 前端工程的 `package.json`
- Read: 前端工程的 `tailwind.config.*`
- Read: 前端工程的 Umi 配置文件，优先 `config/config.ts` 或 `.umirc.ts`

**Interfaces:**

- Consumes: [详细技术设计](../specs/2026-07-06-document-publishing-detailed-technical-design.md)
- Produces: 后续任务使用的模块定位：后端参考模块、`com.xxx.pai.mlp.man.documentcenter` 根包、前端工程目录、数据库类型、配置命名空间、测试命令候选，以及后续迁移需要替换的企业内网接入点。

- [ ] **Step 1: 确认当前目录是独立参考工程或即将创建参考工程的工作区**

Run:

```bash
pwd
git status --short
rg --files -g 'pom.xml' -g 'package.json' -g 'pnpm-lock.yaml' -g 'yarn.lock' -g 'package-lock.json' -g 'config.ts' -g '.umirc.ts' -g 'tailwind.config.*'
```

Expected:

- 能看到至少一个 Maven `pom.xml`。
- 能看到前端 `package.json` 与 lockfile。
- 能确认参考模块是否已经采用 `client/application/domain/infra` 分包；若尚未采用，本需求新增代码必须按该规范创建包。
- `git status --short` 中的既有改动全部被识别为当前需求相关或明确不相关；不得覆盖他人改动。

- [ ] **Step 2: 写入证据报告骨架**

Create `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`:

```markdown
# Document Publishing Independent Baseline Report

验证日期：2026-07-07
目标：验证文档发布中心独立参考工程是否可以进入完整功能开发，并沉淀后续迁移到企业内网系统的替换点。

## 1. 仓库与模块定位

状态：BLOCKED

| 项目 | 结论 | 证据 |
|---|---|---|
| 后端承载模块 |  |  |
| 后端根包与分层 |  |  |
| 前端工程目录 |  |  |
| 数据库类型与版本 |  |  |
| 配置中心/环境 |  |  |
| 后端测试命令 |  |  |
| 前端测试命令 |  |  |
| E2E 测试命令 |  |  |

## 2. 后端依赖闭合与测试命令

状态：BLOCKED

## 3. 数据库 DDL 与事务验证

状态：BLOCKED

## 4. 存储抽象上传/读取/删除验证

状态：BLOCKED

## 5. `CommonResponse<T>`、权限、CSRF、ID 和审计接入验证

状态：BLOCKED

## 6. 前端 Umi/Tailwind/TypeScript/Tiptap/Mermaid 构建 Spike

状态：BLOCKED

## 7. E2E 与 CI 门禁

状态：BLOCKED

## 8. 进入完整功能开发的结论

状态：BLOCKED

结论：独立基线尚未完成，不进入完整功能开发。
```

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: add document publishing sprint 0 validation report"
```

Expected: commit succeeds, and report exists in the independent reference project.

## Task 2: 后端依赖闭合与测试门禁

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Read: 后端承载模块的 `pom.xml`
- Read: 根 `pom.xml`

**Interfaces:**

- Consumes: Task 1 的后端承载模块定位。
- Produces: 是否允许开始后端表、Mapper、Service 编码的判断。

- [ ] **Step 1: 输出有效依赖树**

Run from the backend module or Maven root selected in Task 1:

```bash
mvn -DskipTests dependency:tree
```

Expected:

- 能看到 Spring Boot 2.3.12.RELEASE 相关依赖闭合。
- Jackson `core`、`databind`、`annotations`、JSR-310 module 版本不混装。
- 没有同时把 `javax.servlet.*` 与 `jakarta.servlet.*` 两套 Servlet API 都直接打入目标 Web 运行包。
- 除本机 MinIO 验证所需的 AWS SDK v2 S3 adapter 外，没有为文档模块新增 JPA、Redis、Kafka、Elasticsearch 主链路依赖。

- [ ] **Step 2: 确认 MyBatis 与事务边界**

Run:

```bash
rg -n '@MapperScan|SqlSessionFactory|DataSourceTransactionManager|MybatisPlusInterceptor|PageInterceptor|@EnableTransactionManagement' .
```

Expected:

- 找到 Mapper 扫描配置。
- 找到事务管理器或 Spring Boot 自动配置证据。
- 如果已注册 PageHelper 或 MyBatis-Plus 分页插件，报告中注明文档树与标题搜索 Mapper 不走分页拦截器。

- [ ] **Step 3: 确认测试命令确实执行测试**

Run:

```bash
mvn test
find . -path '*surefire-reports*' -type f
```

Expected:

- `mvn test` 不应被父 POM 的 `skipTests=true` 静默跳过。
- 若 `mvn test` 被跳过，报告必须记录实际可用命令，例如 `mvn -DskipTests=false test`、模块级命令或 CI 命令。
- `surefire-reports` 或等价测试报告数量大于 0。

- [ ] **Step 4: 更新报告结论**

Update section `2. 后端依赖闭合与测试命令` with:

- dependency tree 命令。
- 测试命令。
- 测试报告数量。
- 依赖风险。
- `PASS`、`FAIL` 或 `BLOCKED`。

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record backend baseline validation"
```

## Task 3: 数据库 DDL 与事务验证

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Create: 后端测试资源中的临时迁移或测试 SQL，按参考工程规范命名
- Test: 后端集成测试文件，按参考工程规范命名

**Interfaces:**

- Consumes: [详细技术设计 4.3～4.7 表设计](../specs/2026-07-06-document-publishing-detailed-technical-design.md#43-doc_node)
- Produces: 五表 DDL 是否兼容 MySQL 8.0 与 OceanBase MySQL 模式迁移目标的结论。

- [ ] **Step 1: 在测试库执行五表 DDL**

Use the DDL from detailed technical design:

- `doc_node`
- `doc_document`
- `doc_asset`
- `doc_asset_ref`
- `doc_tree_meta`

Expected:

- 五张表创建成功。
- `utf8mb4_bin` 或目标等价二进制排序规则可用。
- `doc_node(parent_id, published_name_key)` 唯一索引允许多行 `published_name_key=NULL`。
- `LONGTEXT` 或目标等价类型满足 2 MB JSON 上限。

- [ ] **Step 2: 验证唯一索引和发布事务核心 SQL**

Run equivalent SQL in the target test database:

```sql
INSERT INTO doc_node(id, parent_id, node_type, draft_name, draft_name_key, published_name, published_name_key, sort_order, node_version, created_by, created_at, updated_by, updated_at)
VALUES
  (1001, 0, 'DOCUMENT', '草稿A', '草稿a', NULL, NULL, 10, 1, 1, NOW(), 1, NOW()),
  (1002, 0, 'DOCUMENT', '草稿B', '草稿b', NULL, NULL, 20, 1, 1, NOW(), 1, NOW());

INSERT INTO doc_document(document_id, draft_schema_version, draft_content_json, draft_revision, publication_version, is_published, draft_updated_by, draft_updated_at)
VALUES
  (1001, 1, '{"type":"doc","content":[]}', 1, 0, 0, 1, NOW()),
  (1002, 1, '{"type":"doc","content":[]}', 1, 0, 0, 1, NOW());

UPDATE doc_node
SET published_name = draft_name,
    published_name_key = draft_name_key,
    updated_by = 1,
    updated_at = NOW()
WHERE id = 1001;

UPDATE doc_document
SET published_schema_version = draft_schema_version,
    published_content_json = draft_content_json,
    published_revision = draft_revision,
    publication_version = publication_version + 1,
    is_published = 1,
    published_by = 1,
    published_at = NOW()
WHERE document_id = 1001
  AND draft_revision = 1;
```

Expected:

- 两条未发布文档允许共存。
- 发布列到列复制成功。
- `publication_version` 从 0 递增到 1。
- 用错误 `draft_revision` 再执行一次发布更新影响 0 行。

- [ ] **Step 3: 验证 `INSERT ... SELECT` 复制 PUBLISHED 引用**

Run equivalent SQL:

```sql
INSERT INTO doc_asset(id, document_id, asset_kind, status, storage_key, original_name, file_extension, mime_type, size_bytes, created_by, created_at, updated_by, updated_at)
VALUES (2001, 1001, 'IMAGE', 'READY', 'doc-center/test/2001.png', 'a.png', 'png', 'image/png', 10, 1, NOW(), 1, NOW());

INSERT INTO doc_asset_ref(document_id, asset_id, ref_scope, created_at)
VALUES (1001, 2001, 'DRAFT', NOW());

DELETE FROM doc_asset_ref
WHERE document_id = 1001
  AND ref_scope = 'PUBLISHED';

INSERT INTO doc_asset_ref(document_id, asset_id, ref_scope, created_at)
SELECT document_id, asset_id, 'PUBLISHED', NOW()
FROM doc_asset_ref
WHERE document_id = 1001
  AND ref_scope = 'DRAFT';
```

Expected:

- `DRAFT` 与 `PUBLISHED` 引用同时存在。
- 删除草稿引用不会删除线上引用。

- [ ] **Step 4: 更新报告结论并提交**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record database baseline validation"
```

## Task 4: 存储抽象上传、读取、删除验证

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Create: 后端测试代码中的 `DocumentObjectStorage` 适配器 Spike，按参考工程规范命名
- Test: 后端存储适配器测试，按参考工程规范命名

**Interfaces:**

- Consumes: 独立工程的 MinIO S3 adapter；迁移时替换为 `platform-support-storage-v2`。
- Produces: `DocumentAssetService` 是否可以采用后端代理流式上传的结论，以及企业内网存储 SDK 的替换清单。

- [ ] **Step 1: 定义存储抽象与迁移替换点**

Run:

```bash
rg -n 'DocumentObjectStorage|Storage|Object|upload|download|delete|presign|temporary|InputStream|MinIO|Local' .
```

Expected:

- 找到或创建 `DocumentObjectStorage` 抽象。
- 明确独立工程使用的 MinIO S3 adapter 是否支持：上传流、读取流、删除、对象不存在处理、元数据读取。
- 报告中记录迁移到 `platform-support-storage-v2` 时必须替换的 adapter 类、配置项和异常映射。

- [ ] **Step 2: 写最小 Spike**

Implement a temporary adapter in the reference backend test source with these logical operations:

```java
interface DocumentObjectStorageSpike {
    String put(String storageKey, java.io.InputStream inputStream, long sizeBytes, String contentType);
    java.io.InputStream get(String storageKey);
    void delete(String storageKey);
}
```

Expected:

- `put` 不把 50 MB 文件整体读入堆内存。
- `get` 能读取刚上传对象。
- `delete` 对已存在对象成功。
- `delete` 对不存在对象按幂等成功或可识别异常处理。

- [ ] **Step 3: 运行存储故障测试**

Test cases:

1. 1 KB PNG 样例上传、读取、删除。
2. 接近 50 MB 的附件流式上传，不调用 `MultipartFile.getBytes()`。
3. 删除不存在对象。
4. SDK 超时或权限错误被映射为可重试的存储错误。

Expected:

- 所有测试通过，或报告写明无法满足后端代理上传的具体阻塞点。

- [ ] **Step 4: 更新报告结论并提交**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record storage baseline validation"
```

## Task 5: `CommonResponse<T>`、权限、CSRF、ID 和审计接入验证

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Read: 参考工程 Controller、异常处理、权限占位、审计字段和 ID 生成器代码

**Interfaces:**

- Consumes: 独立工程内的 `CommonResponse<T>`、异常映射、登录用户占位、审计字段和 ID 生成器；迁移时替换为企业平台真实实现。
- Produces: 文档中心 Controller、DTO、异常码、审计字段的接入约定。

- [ ] **Step 1: 定位统一响应和异常映射**

Run:

```bash
rg -n 'CommonResponse|Response|Result|ControllerAdvice|ExceptionHandler|requestId|traceId|code|message|data' .
```

Expected:

- 找到或创建统一 `CommonResponse<T>` 类型，字段设计尽量贴近企业系统。
- 找到业务异常转 HTTP 状态和业务码的位置。
- 明确文档模块错误码如何注册或声明。

- [ ] **Step 2: 定位权限、CSRF 和后台接口保护方式**

Run:

```bash
rg -n 'PreAuthorize|RequiresPermissions|Permission|Access|Auth|Login|Csrf|csrf|Admin|OperationLog|Audit' .
```

Expected:

- 找到后台写接口使用的权限注解、拦截器或占位接口。
- 找到用户端登录态校验占位方式。
- 找到 CSRF 防护是否覆盖 JSON 与 multipart；独立工程若暂不启用，也必须在报告中写明迁移风险。
- 找到操作审计占位方式和企业迁移替换点。

- [ ] **Step 3: 定位 ID 和审计字段约定**

Run:

```bash
rg -n 'IdGenerator|Snowflake|nextId|createdBy|createdAt|updatedBy|updatedAt|MetaObjectHandler|Auditor' .
```

Expected:

- 明确 BIGINT ID 来源。
- 明确前端必须把 BIGINT 序列化为字符串。
- 明确审计字段由基类、MyBatis handler、应用服务还是数据库填充。

- [ ] **Step 4: 更新报告结论并提交**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record platform web baseline validation"
```

## Task 6: 前端 Tiptap、Markdown、Static Renderer、Mermaid 构建 Spike

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Read: 前端 `package.json`
- Read: 前端 lockfile
- Read: Umi 配置与 Tailwind 配置
- Create: 前端临时 Spike 页面、组件和测试，按参考工程规范命名

**Interfaces:**

- Consumes: @umijs/max 4.5.3、Tailwind 3.4.17、TypeScript 4.9.5。
- Produces: 可锁定的 Tiptap 版本组合和前端拆包结论。

- [ ] **Step 1: 确认前端基础版本**

Run from frontend directory:

```bash
node -v
pnpm -v
pnpm list @umijs/max tailwindcss typescript react react-dom
```

Expected:

- `@umijs/max` 为 4.5.3。
- `tailwindcss` 为 3.4.17。
- `typescript` 为 4.9.5。
- React 版本被记录进报告。

- [ ] **Step 2: 安装或锁定 Spike 依赖**

Use the project package manager. Candidate packages:

```text
@tiptap/core
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-cell
@tiptap/extension-table-header
@tiptap/extension-code-block-lowlight
@tiptap/static-renderer
mermaid
lowlight
```

Expected:

- 所有 `@tiptap/*` 固定同一组精确版本。
- lockfile 变化可审查。
- 若最新 Tiptap 3 与 TypeScript 4.9.5 不兼容，选择兼容小版本或记录 FAIL，不静默升级全局 TypeScript。

- [ ] **Step 3: 创建最小编辑/阅读 Spike**

Spike must prove:

1. `editor.getJSON()` 得到可保存 JSON。
2. Static Renderer 可以把同一 JSON 渲染为只读 React 组件。
3. Markdown 粘贴可转换基础标题、列表、引用、链接、围栏代码和表格。
4. Mermaid 节点只保存源码，发布前前端校验语法错误。
5. 没有 Mermaid 节点的普通用户页面不加载 Mermaid 包。
6. `.document-content` 与 `.ProseMirror` 样式不依赖任意文档 class。

- [ ] **Step 4: 运行前端测试和生产构建**

Run:

```bash
pnpm test
pnpm build
```

Expected:

- TypeScript 4.9.5 编译通过。
- Umi 生产构建通过。
- 构建产物证明编辑器、Mermaid、代码高亮不进入普通用户首屏主包，或报告记录需要调整的拆包配置。

- [ ] **Step 5: 更新报告结论并提交**

Run:

```bash
git add package.json pnpm-lock.yaml docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record frontend editor baseline validation"
```

## Task 7: E2E 与 CI 门禁

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Read: CI 配置
- Read: E2E 测试配置

**Interfaces:**

- Consumes: Task 2 和 Task 6 的可执行测试命令。
- Produces: 开发阶段每个 PR 必须运行的门禁命令。

- [ ] **Step 1: 定位 CI 与 E2E 工具**

Run:

```bash
rg --files -g '.github/**' -g '.gitlab-ci.yml' -g 'Jenkinsfile' -g 'playwright.config.*' -g 'cypress.config.*' -g 'vitest.config.*' -g 'jest.config.*'
```

Expected:

- 找到 CI 或记录没有 CI。
- 找到前端单测和 E2E 工具，或记录需要新增。

- [ ] **Step 2: 定义文档中心最小 E2E 场景**

Required E2E scenarios:

1. 新建目录和草稿，用户端不可见。
2. 粘贴 Markdown，插入图片、附件和 Mermaid，预览可渲染。
3. 发布后用户树出现文档，详情可访问。
4. 编辑已发布文档后用户继续看到旧标题和旧正文。
5. 发布更新后标题、正文和资源一起切换。
6. 取消发布后用户树、旧 URL 和资源均 404。
7. Mermaid 语法错误时前端不调用发布 API。
8. 用户资源接口拒绝草稿资源。

- [ ] **Step 3: 更新报告结论并提交**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md
git commit -m "docs: record document publishing ci gate"
```

## Task 8: 独立基线 Go/No-Go Review

**Files:**

- Modify: `docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md`
- Modify: `docs/superpowers/specs/2026-07-06-document-publishing-detailed-technical-design.md` only if validation finds a real platform constraint that changes an adapter or command, not product scope.

**Interfaces:**

- Consumes: Task 1～7 的报告结论。
- Produces: 是否进入完整功能开发的最终判断。

- [ ] **Step 1: 逐项判定门禁**

Mark each gate:

| Gate | Required result |
|---|---|
| 后端 dependency tree | PASS |
| 后端包结构与命名规范 | PASS |
| 测试命令可执行且报告非零 | PASS |
| 五表 DDL | PASS |
| 发布/取消发布事务 SQL | PASS |
| 存储抽象最小上传/读取/删除 | PASS |
| `CommonResponse<T>`/权限/CSRF/ID/审计 | PASS |
| 前端 Tiptap/Markdown/Mermaid 构建 Spike | PASS |
| E2E/CI 命令 | PASS 或明确已有替代门禁 |

- [ ] **Step 2: 写最终结论**

Use exactly one final status:

```markdown
## 8. 进入完整功能开发的结论

状态：PASS

结论：独立基线已完成，可以进入完整功能开发。

并行开发线：
1. 后端表、Mapper、领域服务、接口和契约测试。
2. 管理端 Schema、编辑器、自定义节点、自动保存和发布流。
3. 用户端 Reader、文档树、详情页、资源读取和 E2E。
```

If any required gate fails:

```markdown
## 8. 进入完整功能开发的结论

状态：FAIL

结论：独立基线未通过，不进入完整功能开发。

阻塞项：
1. 写明具体失败门禁、影响和建议修复路径。
```

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/reports/2026-07-07-document-publishing-sprint-0-validation-report.md docs/superpowers/specs/2026-07-06-document-publishing-detailed-technical-design.md
git commit -m "docs: finalize document publishing sprint 0 validation"
```

## Self-Review

- Spec coverage: 本计划覆盖详细技术设计 23.1 的 6 个开发就绪门禁，并补充 E2E/CI Go/No-Go。
- Placeholder scan: 本计划不允许写 `PASS` 但没有证据；独立工程模块路径未知时必须写 `BLOCKED`，不能用猜测路径替代。
- Type consistency: 本计划沿用 `draftRevision`、`publishedRevision`、`publicationVersion`、`treeRevision`、`DRAFT`、`PUBLISHED`、`READY`、`UPLOADING` 等详细设计命名。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-document-publishing-sprint-0-validation-plan.md`.

推荐执行方式：先在当前工作区或新建的独立参考工程中使用 `superpowers:executing-plans` 按任务顺序执行。当前 `/Users/baron/code/doc-editor` 仍主要是文档工作区，只有在补齐独立后端/前端源码并完成上述证据报告后，才能声称独立基线已通过。迁移到企业内网系统时，再按报告中的替换清单接入真实认证、`CommonResponse<T>`、存储 SDK、菜单权限、包名前缀和配置中心。
