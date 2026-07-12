package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentSearchVO;

public interface PublishedDocumentQueryService {

    PublishedDocumentDetailVO getPublishedDocument(Long documentId);

    PublishedDocumentSearchVO searchByTitle(String keyword, Integer limit);
}
