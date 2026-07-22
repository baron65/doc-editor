# Document Publishing Independent Baseline Report

验证日期：2026-07-09  
目标：验证文档发布中心独立参考工程是否可以继续进入完整功能开发，并沉淀后续迁移到企业内网系统的替换点。

## 1. 当前结论

状态：PARTIAL PASS

独立参考工程已完成前后端工程框架和核心文档生命周期骨架：

- 后端：Spring Boot 2.3.12.RELEASE、Java 11 目标、MyBatis-Plus 3.5.1、MySQL 8 DDL、`client/application/domain/infra` 分层、`CommonResponse<T>`、管理端/用户端 Controller。
- 前端：`@umijs/max@4.5.3`、Tailwind 3.4.17、TypeScript 4.9.5、Tiptap 3.27.3 基础编辑器、Tiptap Image、管理端/用户端路由和服务层。
- 环境：后端 Maven 由 Maven Wrapper 管理，固定 Apache Maven 3.5.4；前端只固定 pnpm 版本，不在项目内定义包存放路径。
- Docker Compose：仅保留 MySQL 8.0.33 与 MinIO S3 兼容对象存储依赖服务，前后端均按本地命令启动，`docker compose -f docker-compose.dev.yml config` 通过。
- 接口验证：当前已在本地后端 + Compose MySQL 8.0.33 上跑通过建目录、建文档、保存草稿、发布、用户读取、下架和清理链路。
- 本地验证：不再提供额外构建包装入口、独立脚本或前后端应用 Dockerfile，统一使用 Docker MySQL/MinIO、Maven Wrapper 和 pnpm。
- Maven 依赖：MySQL Connector/J 运行时依赖固定为 8.0.33；迁移企业仓库时可按企业 POM 规范决定是否切换到新 Maven 坐标。
- 本地运行入口：已提供 `.env.example` 和 README 直接命令。本地后端默认连接 Compose 暴露到宿主机的 MySQL `13306`，前端代理目标可通过 `DOCUMENT_CENTER_API_PROXY_TARGET` 覆盖。
- 运行时契约：前端 `package.json` 保留 Node.js engines 与 pnpm `packageManager` 声明。
- Docker 边界：当前参考工程不维护前后端应用镜像；如果后续企业部署需要容器化，应在真实企业仓库中按部署平台规范补充。

已完成 Compose MySQL 8.0.33 + Compose MinIO + 本机后端的真实接口验证。对象存储依赖已调整为 Compose MinIO + S3 adapter，并已通过管理端资源上传与下载接口验证写入/读取链路；前后端应用容器化已移出当前参考工程边界。

## 2. 已验证命令

| 验证项 | 命令 | 结果 |
|---|---|---|
| 后端单元测试与编译 | `cd backend && ./mvnw test` | PASS，Tests run: 11, Failures: 0, Errors: 0 |
| 前端严格类型检查 | `cd frontend && pnpm typecheck` | PASS，`tsc --noEmit` 退出码 0 |
| 前端生产构建 | `cd frontend && pnpm build` | PASS，Umi v4.5.3 Webpack compiled successfully |
| Docker Compose 配置 | `docker compose -f docker-compose.dev.yml config` | PASS，MySQL/MinIO 服务配置可解析 |
| 本机依赖启动 | `docker compose -f docker-compose.dev.yml up -d`、`docker compose -f docker-compose.dev.yml ps` | PASS，MySQL healthy，MinIO Up，端口 `13306/19000/19001` 已映射 |
| Maven Wrapper 版本 | `cd backend && ./mvnw -version` | PASS，输出 Apache Maven 3.5.4 |
| 后端 MinIO 连通 | `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=18080` | PASS，Spring Boot 启动成功，S3 adapter 可访问 MinIO 并初始化 bucket |
| 对象上传/下载链路 | `POST /api/v1/document-center/admin/documents/{documentId}/assets`、`GET /api/v1/document-center/admin/documents/{documentId}/assets/{assetId}` | PASS，测试附件上传返回 assetId，下载接口返回 `HTTP 200` 与正确 `Content-Length` |
| 空白/冲突检查 | `git diff --check` | PASS |

## 3. 后端已覆盖范围

状态：PASS FOR SCAFFOLD

已实现并编译通过：

- 管理端树：`GET /api/v1/document-center/admin/tree`
- 新建目录：`POST /api/v1/document-center/admin/directories`
- 新建文档：`POST /api/v1/document-center/admin/documents`
- 目录重命名：`PATCH /api/v1/document-center/admin/directories/{directoryId}`
- 节点移动/排序：`PATCH /api/v1/document-center/admin/nodes/{nodeId}/position`
- 删除空目录或未发布文档：`DELETE /api/v1/document-center/admin/nodes/{nodeId}`
- 草稿详情与保存：`GET/PUT /api/v1/document-center/admin/documents/{documentId}`
- 发布与取消发布：`POST /publish`、`POST /unpublish`
- 用户端树、详情、搜索：`GET /tree`、`GET /documents/{documentId}`、`GET /search?q=`
- 资源上传路径：`POST /api/v1/document-center/admin/documents/{documentId}/assets`
- 上传资源落 `doc_asset`，状态为 `READY`。
- 保存草稿时从 Tiptap JSON 提取 `image` / `attachment` 节点的 `assetId`，替换 `DRAFT` 引用。
- 发布时删除旧 `PUBLISHED` 引用，并从 `DRAFT` 引用复制为 `PUBLISHED`。
- 下架时删除 `PUBLISHED` 引用。
- 管理端资源下载返回二进制流、可信 MIME、文件名和长度响应头。
- 用户端资源下载必须存在 `PUBLISHED` 引用，否则返回不存在。

关键修正：

- 取消发布只依赖 `expectedPublicationVersion`，不再要求 `expectedDraftRevision`。
- 取消发布会清空线上标题、线上正文、线上 revision，并递增 `publicationVersion`。
- 重复取消发布在文档已是草稿态时返回成功语义 `alreadyUnpublished=true`。
- 目录最大四层只计算目录层级；第四层目录下允许放文档。

当前后端仍是参考工程级实现，迁移企业仓库时需要验证或替换：

- 企业 MySQL/OceanBase 的 BIGINT 自增、JDBC generated keys 和迁移后自增起点；
- 企业统一认证、用户 ID、审计字段；
- 企业统一错误码、异常映射和 `CommonResponse<T>` 字段；
- 企业对象存储 adapter；
- 下载审计、企业网关层鉴权和更细的缓存策略。

## 4. 前端已覆盖范围

状态：PASS FOR SCAFFOLD

已实现并验证：

- Umi Max 路由：
  - `/document-center`
  - `/document-center/:documentId`
  - `/admin/document-center`
  - `/admin/document-center/:documentId`
- 管理端基础树操作：
  - 新建文档/目录；
  - 选中节点；
  - 重命名目录；
  - 删除节点；
  - 上移/下移排序。
- 管理端编辑页：
  - Tiptap StarterKit 编辑器；
  - Tiptap Image 图片节点；
  - 图片上传并插入带 `assetId` 的 image 节点；
  - 用户端 Reader 轻量渲染 Tiptap JSON，并按 `assetId` 拼用户端受控图片下载接口；
  - Mermaid 10.7.0 流程图节点、编辑器插入入口和用户端 SVG 渲染组件；
  - Bold/Italic/Underline/Heading/List/Quote/Link 工具栏；
  - 草稿保存、发布、下架；
  - 保留 Tiptap JSON 调试预览。
- 服务层接口路径已与详细技术设计对齐。

Mermaid 已单独锁定为 `mermaid@10.7.0`，并通过动态 import 渲染。Umi/Webpack 兼容点包括：

- `cytoscape/dist/cytoscape.umd.js` alias 到 `cytoscape/dist/cytoscape.esm.mjs`，避免 Mermaid mindmap 懒加载包触发 cytoscape exports 冲突。
- `esbuildMinifyIIFE: true`，避免 Mermaid 多 chunk 触发 Umi esbuild helper 名称冲突。

后端已补 Mermaid 内容安全边界：单篇最多 50 个 Mermaid 块，单块源码最多 50KB。

## 5. Docker/MySQL/MinIO 运行验证

状态：PASS FOR LOCAL DEPENDENCIES

已验证 `docker-compose.dev.yml` 可解析，配置包含：

- `mysql:8.0.33`；
- `quay.io/minio/minio:latest`；
- MySQL 初始化脚本 `backend/src/main/resources/db/schema.sql`；
- 宿主机 MySQL 端口 `13306`；
- 宿主机 MinIO API 端口 `19000`；
- 宿主机 MinIO Console 端口 `19001`。

当前 Docker 只负责 MySQL 与 MinIO 依赖，后端和前端都本地启动。

后端启动后，已通过直接调用接口验证：管理端读取树 revision → 建文档 → 上传附件到 MinIO → 管理端下载附件 → 删除测试文档节点并清理测试资产元数据。完整页面级流程后续可继续通过浏览器验证。

## 6. 是否达到动手开发标准

状态：YES FOR NEXT DEVELOPMENT SLICE

可以继续进入下一阶段功能开发，但不能声明完整功能完成。

建议下一阶段优先级：

1. 完成下载审计、企业鉴权接入和更细的缓存策略。
2. 为树移动/删除、发布并发、草稿冲突补更多服务层测试。
3. 若进入企业仓库迁移，先替换 ID、认证、统一响应、对象存储与审计。
