CREATE TABLE IF NOT EXISTS doc_node (
    id                  BIGINT       NOT NULL,
    parent_id           BIGINT       NOT NULL DEFAULT 0,
    node_type           VARCHAR(16)  NOT NULL,
    draft_name          VARCHAR(200) NOT NULL,
    draft_name_key      VARCHAR(200) NOT NULL,
    published_name      VARCHAR(200) NULL,
    published_name_key  VARCHAR(200) NULL,
    sort_order          INT          NOT NULL,
    node_version        BIGINT       NOT NULL DEFAULT 1,
    creator_id          BIGINT       NOT NULL,
    create_time         DATETIME     NOT NULL,
    updator_id          BIGINT       NOT NULL,
    update_time         DATETIME     NOT NULL,
    is_deleted          TINYINT      NOT NULL DEFAULT 0,
    deletor_id          BIGINT       NULL,
    delete_time         DATETIME     NULL,
    PRIMARY KEY (id),
    KEY idx_doc_node_parent_sort (parent_id, sort_order, id),
    UNIQUE KEY uk_doc_node_parent_draft_name (parent_id, draft_name_key),
    UNIQUE KEY uk_doc_node_parent_published_name (parent_id, published_name_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS doc_document (
    document_id              BIGINT   NOT NULL,
    draft_schema_version     INT      NOT NULL,
    draft_content_json       LONGTEXT NOT NULL,
    draft_revision           BIGINT   NOT NULL DEFAULT 1,
    published_schema_version INT      NULL,
    published_content_json   LONGTEXT NULL,
    published_revision       BIGINT   NULL,
    publication_version      BIGINT   NOT NULL DEFAULT 0,
    is_published             TINYINT  NOT NULL DEFAULT 0,
    draft_updated_by         BIGINT   NOT NULL,
    draft_updated_at         DATETIME NOT NULL,
    published_by             BIGINT   NULL,
    published_at             DATETIME NULL,
    is_deleted               TINYINT  NOT NULL DEFAULT 0,
    deletor_id               BIGINT   NULL,
    delete_time              DATETIME NULL,
    PRIMARY KEY (document_id),
    KEY idx_doc_document_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS doc_asset (
    id              BIGINT       NOT NULL,
    document_id     BIGINT       NOT NULL,
    asset_kind      VARCHAR(16)  NOT NULL,
    status          VARCHAR(16)  NOT NULL,
    storage_key     VARCHAR(500) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    file_extension  VARCHAR(32)  NULL,
    mime_type       VARCHAR(128) NOT NULL,
    size_bytes      BIGINT       NOT NULL,
    creator_id      BIGINT       NOT NULL,
    create_time     DATETIME     NOT NULL,
    updator_id      BIGINT       NOT NULL,
    update_time     DATETIME     NOT NULL,
    is_deleted      TINYINT      NOT NULL DEFAULT 0,
    deletor_id      BIGINT       NULL,
    delete_time     DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doc_asset_storage_key (storage_key),
    KEY idx_doc_asset_document_status (document_id, status),
    KEY idx_doc_asset_status_updated (status, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS doc_asset_ref (
    document_id BIGINT      NOT NULL,
    asset_id    BIGINT      NOT NULL,
    ref_scope   VARCHAR(16) NOT NULL,
    create_time DATETIME    NOT NULL,
    is_deleted  TINYINT     NOT NULL DEFAULT 0,
    deletor_id  BIGINT      NULL,
    delete_time DATETIME    NULL,
    PRIMARY KEY (document_id, asset_id, ref_scope),
    KEY idx_doc_asset_ref_asset (asset_id, ref_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS doc_tree_meta (
    meta_id       TINYINT  NOT NULL,
    tree_revision BIGINT   NOT NULL,
    update_time   DATETIME NOT NULL,
    is_deleted    TINYINT  NOT NULL DEFAULT 0,
    deletor_id    BIGINT   NULL,
    delete_time   DATETIME NULL,
    PRIMARY KEY (meta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
