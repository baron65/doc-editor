package com.xxx.pai.mlp.man.documentcenter.client.controller;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentTreeService;
import com.xxx.pai.mlp.man.documentcenter.application.PublishedDocumentQueryService;
import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/document-center")
public class DocumentController {

    private final DocumentTreeService documentTreeService;
    private final PublishedDocumentQueryService publishedDocumentQueryService;

    public DocumentController(
            DocumentTreeService documentTreeService,
            PublishedDocumentQueryService publishedDocumentQueryService) {
        this.documentTreeService = documentTreeService;
        this.publishedDocumentQueryService = publishedDocumentQueryService;
    }

    @GetMapping("/tree")
    public CommonResponse<DocumentTreeVO> getPublishedTree() {
        return CommonResponse.success(documentTreeService.getPublishedTree());
    }

    @GetMapping("/documents/{documentId}")
    public CommonResponse<PublishedDocumentDetailVO> getPublishedDocument(@PathVariable Long documentId) {
        return CommonResponse.success(publishedDocumentQueryService.getPublishedDocument(documentId));
    }

    @GetMapping("/search")
    public CommonResponse<List<PublishedDocumentDetailVO>> search(
            @RequestParam("q") String keyword,
            @RequestParam(defaultValue = "20") Integer limit) {
        return CommonResponse.success(publishedDocumentQueryService.searchByTitle(keyword, limit));
    }
}
