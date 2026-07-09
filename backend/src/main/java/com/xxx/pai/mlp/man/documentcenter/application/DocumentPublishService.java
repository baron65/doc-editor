package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentPublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentUnpublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;

public interface DocumentPublishService {

    DocumentOperationVO publish(Long documentId, DocumentPublishDTO dto);

    DocumentOperationVO unpublish(Long documentId, DocumentUnpublishDTO dto);
}
