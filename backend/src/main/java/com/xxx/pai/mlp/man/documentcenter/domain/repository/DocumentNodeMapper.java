package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface DocumentNodeMapper extends BaseMapper<DocumentNodePO> {
    int softDeleteById(
            @Param("nodeId") Long nodeId,
            @Param("deletorId") Long deletorId,
            @Param("deleteTime") LocalDateTime deleteTime);

    List<DocumentNodePO> searchPublishedByNameKey(
            @Param("escapedKeyword") String escapedKeyword,
            @Param("limit") Integer limit);
}
