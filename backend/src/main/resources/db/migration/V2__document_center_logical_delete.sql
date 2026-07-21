-- Existing environments: execute this migration once before deploying the logical-delete code.
ALTER TABLE doc_node
    ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0 AFTER updated_at,
    ADD COLUMN deletor_id BIGINT NULL AFTER is_deleted,
    ADD COLUMN delete_time DATETIME NULL AFTER deletor_id;

ALTER TABLE doc_document
    ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0 AFTER published_at,
    ADD COLUMN deletor_id BIGINT NULL AFTER is_deleted,
    ADD COLUMN delete_time DATETIME NULL AFTER deletor_id;

ALTER TABLE doc_asset
    ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0 AFTER updated_at,
    ADD COLUMN deletor_id BIGINT NULL AFTER is_deleted,
    ADD COLUMN delete_time DATETIME NULL AFTER deletor_id;

ALTER TABLE doc_asset_ref
    ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0 AFTER created_at,
    ADD COLUMN deletor_id BIGINT NULL AFTER is_deleted,
    ADD COLUMN delete_time DATETIME NULL AFTER deletor_id;

ALTER TABLE doc_tree_meta
    ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0 AFTER updated_at,
    ADD COLUMN deletor_id BIGINT NULL AFTER is_deleted,
    ADD COLUMN delete_time DATETIME NULL AFTER deletor_id;
