package com.xxx.pai.mlp.man.documentcenter.domain.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface DocumentNodeMapper extends BaseMapper<DocumentNodePO> {
    List<DocumentNodePO> searchPublishedByNameKey(
            @Param("escapedKeyword") String escapedKeyword,
            @Param("limit") Integer limit);
}
