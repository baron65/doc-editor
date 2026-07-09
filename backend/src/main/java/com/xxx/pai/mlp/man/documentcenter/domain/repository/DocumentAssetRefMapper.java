package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentAssetRefPO;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface DocumentAssetRefMapper {

    int deleteByDocumentIdAndRefScope(
            @Param("documentId") Long documentId,
            @Param("refScope") String refScope);

    int insertBatch(@Param("refs") List<DocumentAssetRefPO> refs);

    int copyDraftRefsToPublished(@Param("documentId") Long documentId);

    int countByDocumentAssetScope(
            @Param("documentId") Long documentId,
            @Param("assetId") Long assetId,
            @Param("refScope") String refScope);
}
