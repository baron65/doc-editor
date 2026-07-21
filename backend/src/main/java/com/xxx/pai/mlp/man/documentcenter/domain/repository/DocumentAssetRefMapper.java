package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetRefPO;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface DocumentAssetRefMapper {

    int softDeleteByDocumentIdAndRefScope(
            @Param("documentId") Long documentId,
            @Param("refScope") String refScope,
            @Param("deletorId") Long deletorId,
            @Param("deleteTime") LocalDateTime deleteTime);

    int insertBatch(@Param("refs") List<DocumentAssetRefPO> refs);

    int copyDraftRefsToPublished(@Param("documentId") Long documentId);

    int countByDocumentAssetScope(
            @Param("documentId") Long documentId,
            @Param("assetId") Long assetId,
            @Param("refScope") String refScope);

    List<Long> selectAssetIdsByDocumentAndScope(
            @Param("documentId") Long documentId,
            @Param("refScope") String refScope);
}
