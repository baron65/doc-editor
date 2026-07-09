# Document Publishing Reference Project

这是 AI Infra 文档发布中心的独立参考工程，用于在无法直接访问企业内网仓库时，先按目标技术栈完成前后端工程框架与后续功能开发。

## 工程结构

```text
backend/   Spring Boot 2.3.12 + MyBatis-Plus 3.5.1 参考后端
frontend/  @umijs/max 4.5.3 + Tailwind 3.4.17 + TypeScript 4.9.5 参考前端
docs/      产品设计、技术调研、详细技术设计与基线计划
```

## 当前目标

- 后端包结构先按 `com.xxx.pai.mlp.man.documentcenter` 与 `client/application/domain/infra` 搭建。
- 前端先按 Umi Max 单工程搭建管理端与用户端路由，并集成 Tiptap 基础富文本编辑器。
- 文件存储先通过 `DocumentObjectStorage` 抽象隔离，独立工程默认使用 Docker MinIO 作为 S3 兼容对象存储，迁移企业内网时替换为 `platform-support-storage-v2` adapter。
- 统一响应先提供参考版 `CommonResponse<T>`，迁移时替换为企业真实字段、错误码和异常映射。

## 运行时要求

- Node.js：建议使用 `>=22.13.0`。
- pnpm：`11.7.0`，与 [frontend/package.json](/Users/baron/code/doc-editor/frontend/package.json:42) 的 `packageManager` 对齐。
- 后端目标 Java：11。后端 Maven 统一由 Maven Wrapper 管理，当前固定为 Apache Maven 3.5.4；Maven Wrapper 只固定 Maven 版本，不负责切换 JDK，启动后端时请确保当前 shell 使用 Java 11。

## 本地启动命令

先启动本机依赖，再分别启动后端和前端：

```bash
docker compose -f docker-compose.dev.yml up -d
cd frontend
DOCUMENT_CENTER_API_PROXY_TARGET=http://localhost:8080 pnpm start
```

后端本地启动默认连接 Compose 暴露到宿主机的 MySQL 端口 `13306`，并使用 Compose MinIO 的 S3 兼容接口 `http://localhost:19000`。如果你使用自己的 MySQL 或对象存储，再按 [.env.example](/Users/baron/code/doc-editor/.env.example) 覆盖 datasource/storage。

前端默认把 `/api/**` 代理到 `http://localhost:8080`。如果后端地址不同，可以改成：

```bash
cd frontend
DOCUMENT_CENTER_API_PROXY_TARGET=http://your-host:8080 pnpm start
```

也可以参考 [.env.example](/Users/baron/code/doc-editor/.env.example) 把本地运行变量复制到自己的 shell 或 `.env` 文件。当前脚手架不会自动加载 `.env.example`。

前后端手动启动：

```bash
docker compose -f docker-compose.dev.yml up -d
cd backend
./mvnw spring-boot:run

cd frontend
pnpm install
pnpm start
```

## Docker 本机依赖

当前工程只使用 Docker 启动本机依赖：

- `mysql` 使用 `mysql:8.0.33`，初始化执行 [schema.sql](/Users/baron/code/doc-editor/backend/src/main/resources/db/schema.sql)。
- MySQL 容器端口映射到宿主机 `13306`，避免和本机已有 MySQL `3306` 冲突。
- `minio` 使用 `quay.io/minio/minio:latest`，提供 S3 兼容对象存储。
- MinIO API 端口映射到宿主机 `19000`，Console 端口映射到 `19001`。
- MinIO 本地账号为 `document-center` / `document-center-secret`，bucket 默认由后端启动时自动创建为 `document-center`。
- 后端和前端都在本地启动，不提供项目内 Dockerfile 和应用容器编排。

常用验证命令：

```bash
docker compose -f docker-compose.dev.yml config
docker compose -f docker-compose.dev.yml up -d
cd backend && ./mvnw -version
cd backend && ./mvnw -q -DskipTests compile
cd backend && ./mvnw test
cd frontend && pnpm install
cd frontend && pnpm typecheck
cd frontend && pnpm build
git diff --check
```

## 迁移边界

后续进入企业内网系统时，优先替换认证、菜单权限、统一响应、存储 adapter、配置中心和包名前缀，不重写文档树、草稿/发布、资源引用和 Reader/Editor 的核心模型。

## 当前未完成项

- 当前工程不再提供前后端 Docker 镜像构建；Docker 仅用于启动 MySQL 和 MinIO 依赖。
- Mermaid 10.7.0 已锁定并接入编辑器/Reader；Umi 构建兼容配置已写入 `frontend/config/config.ts`。
- 下载审计、企业鉴权接入和更细的缓存策略仍是后续开发项；资源元数据落库、DRAFT/PUBLISHED 引用替换、二进制下载流和下载响应头骨架已完成。
