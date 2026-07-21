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

当前工程的开发编排只使用 Docker 启动本机依赖：

- `mysql` 使用 `mysql:8.0.33`，初始化执行 [schema.sql](/Users/baron/code/doc-editor/backend/src/main/resources/db/schema.sql)。
- MySQL 容器端口映射到宿主机 `13306`，避免和本机已有 MySQL `3306` 冲突。
- `minio` 使用 `quay.io/minio/minio:latest`，提供 S3 兼容对象存储。
- MinIO API 端口映射到宿主机 `19000`，Console 端口映射到 `19001`。
- MinIO 本地账号为 `document-center` / `document-center-secret`，bucket 默认由后端启动时自动创建为 `document-center`。
- 后端和前端开发时在本地启动；生产环境使用独立应用镜像和 `docker-compose.prod.yml`。

已有数据库升级到逻辑删除结构时，需要在部署新版后端前执行一次迁移：

```bash
mysql -h <host> -u <user> -p document_center \
  < backend/src/main/resources/db/migration/V2__document_center_logical_delete.sql
```

新建数据库无需单独执行迁移，`schema.sql` 已包含逻辑删除字段。

## 腾讯云生产部署

生产 compose 只负责拉取镜像并编排服务，不在服务器上执行构建。前端容器使用 Nginx 提供静态页面，并将 `/api` 反向代理到后端容器。

### 构建并推送前后端镜像

在项目根目录执行：

```bash
docker build -f backend/Dockerfile -t ccr.ccs.tencentyun.com/baron/doc-editor-backend:latest backend
docker push ccr.ccs.tencentyun.com/baron/doc-editor-backend:latest

docker build -f frontend/Dockerfile -t ccr.ccs.tencentyun.com/baron/doc-editor-frontend:latest frontend
docker push ccr.ccs.tencentyun.com/baron/doc-editor-frontend:latest
```

### 服务器启动

将 [.env.production.example](/Users/baron/code/doc-editor/.env.production.example) 复制为服务器上的 `.env`，填写数据库和 MinIO 实际凭据，然后执行：

```bash
docker login ccr.ccs.tencentyun.com
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

默认对外提供 `80` 端口，可通过 `DOCUMENT_CENTER_HTTP_PORT` 修改。生产编排默认使用腾讯云仓库中的 MySQL、MinIO、后端和前端镜像；如果 MySQL/MinIO 已由腾讯云其他服务独立运行，可在 `.env` 中将后端的连接配置改为对应地址，并移除 compose 中不需要的依赖服务。

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

- 前后端 Dockerfile 分别位于 [backend/Dockerfile](/Users/baron/code/doc-editor/backend/Dockerfile) 和 [frontend/Dockerfile](/Users/baron/code/doc-editor/frontend/Dockerfile)；开发 compose 与生产 compose 分离。
- Mermaid 10.7.0 已锁定并接入编辑器/Reader；Umi 构建兼容配置已写入 `frontend/config/config.ts`。
- 下载审计、企业鉴权接入和更细的缓存策略仍是后续开发项；资源元数据落库、DRAFT/PUBLISHED 引用替换、二进制下载流和下载响应头骨架已完成。
