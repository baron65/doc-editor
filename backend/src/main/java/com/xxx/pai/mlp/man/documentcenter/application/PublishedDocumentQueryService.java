package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import java.util.List;

public interface PublishedDocumentQueryService {

    PublishedDocumentDetailVO getPublishedDocument(Long documentId);

    List<PublishedDocumentDetailVO> searchByTitle(String keyword, Integer limit);
}

