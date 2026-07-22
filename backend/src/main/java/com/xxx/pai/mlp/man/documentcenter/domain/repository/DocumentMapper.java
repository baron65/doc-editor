package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Param;

public interface DocumentMapper extends BaseMapper<DocumentPO> {

    int softDeleteById(
            @Param("documentId") Long documentId,
            @Param("deletorId") Long deletorId,
            @Param("deleteTime") LocalDateTime deleteTime);

    int updateDraftIfRevisionMatches(
            @Param("documentId") Long documentId,
            @Param("expectedDraftRevision") Long expectedDraftRevision,
            @Param("schemaVersion") Integer schemaVersion,
            @Param("contentJson") String contentJson,
            @Param("updatorId") Long updatorId,
            @Param("updateTime") LocalDateTime updateTime);

    int publishIfRevisionsMatch(
            @Param("documentId") Long documentId,
            @Param("expectedDraftRevision") Long expectedDraftRevision,
            @Param("expectedPublicationVersion") Long expectedPublicationVersion,
            @Param("publishedBy") Long publishedBy,
            @Param("publishedAt") LocalDateTime publishedAt);

    int unpublishIfPublicationVersionMatches(
            @Param("documentId") Long documentId,
            @Param("expectedPublicationVersion") Long expectedPublicationVersion);
}
