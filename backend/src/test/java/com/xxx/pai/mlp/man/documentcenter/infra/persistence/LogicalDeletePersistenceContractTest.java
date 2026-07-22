package com.xxx.pai.mlp.man.documentcenter.infra.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.baomidou.mybatisplus.annotation.TableLogic;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetRefPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentTreeMetaPO;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

class LogicalDeletePersistenceContractTest {

    private static final List<Class<?>> DOCUMENT_TABLE_POS = List.of(
            DocumentNodePO.class,
            DocumentPO.class,
            DocumentAssetPO.class,
            DocumentAssetRefPO.class,
            DocumentTreeMetaPO.class);

    @Test
    void everyDocumentCenterTableDefinesLogicalDeleteAuditColumns() throws IOException {
        String schema = readClasspathResource("db/schema.sql");
        String migration = readClasspathResource("db/migration/V2__document_center_logical_delete.sql");

        assertThat(countOccurrences(schema, "is_deleted")).isGreaterThanOrEqualTo(5);
        assertThat(countOccurrences(schema, "deletor_id")).isGreaterThanOrEqualTo(5);
        assertThat(countOccurrences(schema, "delete_time")).isGreaterThanOrEqualTo(5);
        assertThat(countOccurrences(migration, "ADD COLUMN is_deleted")).isEqualTo(5);
        assertThat(countOccurrences(migration, "ADD COLUMN deletor_id")).isEqualTo(5);
        assertThat(countOccurrences(migration, "ADD COLUMN delete_time")).isEqualTo(5);
    }

    @Test
    void auditColumnNamesFollowCompanyConvention() throws IOException {
        String schema = readClasspathResource("db/schema.sql");
        String migration = readClasspathResource("db/migration/V3__document_center_audit_column_names.sql");

        assertThat(schema)
                .contains("creator_id", "create_time", "updator_id", "update_time")
                .doesNotContain(
                        "\n    created_by",
                        "\n    created_at",
                        "\n    updated_by",
                        "\n    updated_at");
        assertThat(migration)
                .contains(
                        "CHANGE COLUMN created_by creator_id",
                        "CHANGE COLUMN created_at create_time",
                        "CHANGE COLUMN updated_by updator_id",
                        "CHANGE COLUMN updated_at update_time");
    }

    @Test
    void everyPersistenceObjectMarksIsDeletedAsTableLogic() throws NoSuchFieldException {
        for (Class<?> poClass : DOCUMENT_TABLE_POS) {
            TableLogic tableLogic = poClass.getDeclaredField("isDeleted").getAnnotation(TableLogic.class);
            assertThat(tableLogic)
                    .as("%s.isDeleted should be a MyBatis-Plus logical-delete field", poClass.getSimpleName())
                    .isNotNull();
            assertThat(tableLogic.value()).isEqualTo("0");
            assertThat(tableLogic.delval()).isEqualTo("1");
            assertThat(poClass.getDeclaredField("deletorId")).isNotNull();
            assertThat(poClass.getDeclaredField("deleteTime")).isNotNull();
        }
    }

    @Test
    void assetReferenceReplacementUsesSoftDeleteAndFiltersDeletedRows() throws IOException {
        String mapper = readClasspathResource("mapper/documentcenter/DocumentAssetRefMapper.xml");

        assertThat(mapper).doesNotContain("DELETE FROM doc_asset_ref");
        assertThat(mapper).contains("is_deleted = 1", "deletor_id", "delete_time");
        assertThat(countOccurrences(mapper, "is_deleted = 0")).isGreaterThanOrEqualTo(4);
    }

    @Test
    void deletedNodeNamesAreReleasedWithoutWeakeningActiveNameUniqueness() throws IOException {
        String schema = readClasspathResource("db/schema.sql");
        String mapper = readClasspathResource("mapper/documentcenter/DocumentNodeMapper.xml");

        assertThat(schema)
                .contains(
                        "UNIQUE KEY uk_doc_node_parent_draft_name (parent_id, draft_name_key)",
                        "UNIQUE KEY uk_doc_node_parent_published_name (parent_id, published_name_key)");
        assertThat(mapper)
                .contains(
                        "draft_name_key = CONCAT('#deleted#', id)",
                        "ELSE CONCAT('#deleted#', id)",
                        "WHERE id = #{nodeId}",
                        "AND is_deleted = 0");
    }

    private static String readClasspathResource(String path) throws IOException {
        try (InputStream input = LogicalDeletePersistenceContractTest.class.getClassLoader()
                .getResourceAsStream(path)) {
            assertThat(input).as("classpath resource %s", path).isNotNull();
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static int countOccurrences(String source, String token) {
        return (source.length() - source.replace(token, "").length()) / token.length();
    }
}
