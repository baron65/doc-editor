package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDraftDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.AdminDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;

public interface DocumentDraftService {

    AdminDocumentDetailVO getDraft(Long documentId);

    DocumentOperationVO saveDraft(Long documentId, DocumentDraftDTO dto);
}

