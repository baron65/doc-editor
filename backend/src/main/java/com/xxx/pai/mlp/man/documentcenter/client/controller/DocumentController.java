package com.xxx.pai.mlp.man.documentcenter.client.controller;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentTreeService;
import com.xxx.pai.mlp.man.documentcenter.application.PublishedDocumentQueryService;
import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentSearchVO;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

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
    public ResponseEntity<CommonResponse<DocumentTreeVO>> getPublishedTree(WebRequest request) {
        DocumentTreeVO tree = documentTreeService.getPublishedTree();
        String etag = quotedEtag("doc-tree-" + tree.getTreeRevision());
        if (request.checkNotModified(etag)) {
            return notModified();
        }
        return cacheableOk(etag, CommonResponse.success(tree));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<CommonResponse<PublishedDocumentDetailVO>> getPublishedDocument(
            @PathVariable Long documentId, WebRequest request) {
        PublishedDocumentDetailVO detail = publishedDocumentQueryService.getPublishedDocument(documentId);
        String etag = quotedEtag("doc-" + detail.getDocumentId() + "-" + detail.getPublicationVersion());
        if (request.checkNotModified(etag)) {
            return notModified();
        }
        return cacheableOk(etag, CommonResponse.success(detail));
    }

    @GetMapping("/search")
    public CommonResponse<PublishedDocumentSearchVO> search(
            @RequestParam("q") String keyword,
            @RequestParam(defaultValue = "20") Integer limit) {
        return CommonResponse.success(publishedDocumentQueryService.searchByTitle(keyword, limit));
    }

    private <T> ResponseEntity<CommonResponse<T>> cacheableOk(String etag, CommonResponse<T> body) {
        return ResponseEntity.ok()
                .eTag(etag)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache")
                .body(body);
    }

    private <T> ResponseEntity<CommonResponse<T>> notModified() {
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache")
                .build();
    }

    private String quotedEtag(String value) {
        return '"' + value + '"';
    }
}
