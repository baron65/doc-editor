# Document Center Backend

Spring Boot 2.3.12.RELEASE + Java 11 + MyBatis-Plus 3.5.1 reference backend.

## Package layout

```text
com.xxx.pai.mlp.man.documentcenter
├── client
├── application
├── domain
│   ├── ability
│   ├── bo
│   ├── po
│   └── repository
└── infra
```

## Run

Recommended local run from repository root:

```bash
docker compose -f ../docker-compose.dev.yml up -d
cd backend
./mvnw spring-boot:run
```

The command above points to Compose MySQL on host port `13306` and Compose MinIO on host port `19000`.

Override the local MySQL or object storage connection when needed. See `../.env.example` for the available runtime variables.

Manual backend run:

```bash
./mvnw spring-boot:run
```

The default datasource points to Compose MySQL on `localhost:13306`, database `document_center`.

Runtime environment variables are listed in `../.env.example`.

Use `./mvnw` for local development even if Maven is not installed globally. The wrapper manages only the Maven distribution version; dependency downloads go to the normal global Maven cache under `~/.m2`.

Useful local checks:

```bash
./mvnw -q -DskipTests compile
./mvnw test
```

The backend itself runs locally. Docker is only used for MySQL 8.0.33 and MinIO S3-compatible object storage. Maven is managed by `./mvnw`, pinned to Apache Maven 3.5.4 in `.mvn/wrapper/maven-wrapper.properties`; make sure the current shell uses Java 11 before starting the backend. See the root README for the full local startup sequence.
