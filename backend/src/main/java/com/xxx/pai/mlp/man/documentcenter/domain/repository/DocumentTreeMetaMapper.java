package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentTreeMetaPO;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Param;

public interface DocumentTreeMetaMapper extends BaseMapper<DocumentTreeMetaPO> {

    int incrementRevisionIfMatches(
            @Param("metaId") Integer metaId,
            @Param("expectedTreeRevision") Long expectedTreeRevision,
            @Param("updateTime") LocalDateTime updateTime);
}
