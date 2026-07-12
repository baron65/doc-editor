package com.xxx.pai.mlp.man.documentcenter.client.controller;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentAssetService;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentAssetDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentAssetVO;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.DocumentAssetDownloadBO;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/document-center")
public class DocumentAssetController {

    private final DocumentAssetService documentAssetService;

    public DocumentAssetController(DocumentAssetService documentAssetService) {
        this.documentAssetService = documentAssetService;
    }

    @PostMapping("/admin/documents/{documentId}/assets")
    public CommonResponse<DocumentAssetVO> upload(
            @PathVariable Long documentId,
            @Valid @RequestPart("meta") DocumentAssetDTO dto,
            @RequestPart("file") MultipartFile file) throws IOException {
        dto.setDocumentId(documentId);
        return CommonResponse.success(documentAssetService.upload(dto, file));
    }

    @GetMapping("/admin/documents/{documentId}/assets/{assetId}")
    public ResponseEntity<InputStreamResource> getAdminAsset(
            @PathVariable Long documentId,
            @PathVariable Long assetId) throws IOException {
        return toDownloadResponse(documentAssetService.openAdminAsset(documentId, assetId), CacheControl.noCache());
    }

    @GetMapping("/documents/{documentId}/assets/{assetId}")
    public ResponseEntity<InputStreamResource> getPublishedAsset(
            @PathVariable Long documentId,
            @PathVariable Long assetId) throws IOException {
        return toDownloadResponse(documentAssetService.openPublishedAsset(documentId, assetId), CacheControl.noCache());
    }

    private ResponseEntity<InputStreamResource> toDownloadResponse(
            DocumentAssetDownloadBO download,
            CacheControl cacheControl) {
        ContentDisposition contentDisposition = ContentDisposition.builder(download.isInline() ? "inline" : "attachment")
                .filename(download.getOriginalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .cacheControl(cacheControl)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(download.getMimeType()))
                .contentLength(download.getSizeBytes())
                .body(new InputStreamResource(download.getInputStream()));
    }
}
