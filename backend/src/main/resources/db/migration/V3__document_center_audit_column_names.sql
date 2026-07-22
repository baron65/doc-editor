-- Align document-center audit columns with company naming conventions.
ALTER TABLE doc_node
    CHANGE COLUMN created_by creator_id BIGINT NOT NULL,
    CHANGE COLUMN created_at create_time DATETIME NOT NULL,
    CHANGE COLUMN updated_by updator_id BIGINT NOT NULL,
    CHANGE COLUMN updated_at update_time DATETIME NOT NULL;

ALTER TABLE doc_asset
    CHANGE COLUMN created_by creator_id BIGINT NOT NULL,
    CHANGE COLUMN created_at create_time DATETIME NOT NULL,
    CHANGE COLUMN updated_by updator_id BIGINT NOT NULL,
    CHANGE COLUMN updated_at update_time DATETIME NOT NULL;

ALTER TABLE doc_asset_ref
    CHANGE COLUMN created_at create_time DATETIME NOT NULL;

ALTER TABLE doc_tree_meta
    CHANGE COLUMN updated_at update_time DATETIME NOT NULL;
