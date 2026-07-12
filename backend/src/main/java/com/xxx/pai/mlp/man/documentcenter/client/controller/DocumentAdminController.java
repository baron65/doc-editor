package com.xxx.pai.mlp.man.documentcenter.client.controller;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentDraftService;
import com.xxx.pai.mlp.man.documentcenter.application.DocumentPublishService;
import com.xxx.pai.mlp.man.documentcenter.application.DocumentTreeService;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryRenameDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDraftDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentPublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentUnpublishDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.NodePositionDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.AdminDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/document-center/admin")
public class DocumentAdminController {

    private final DocumentTreeService documentTreeService;
    private final DocumentDraftService documentDraftService;
    private final DocumentPublishService documentPublishService;

    public DocumentAdminController(
            DocumentTreeService documentTreeService,
            DocumentDraftService documentDraftService,
            DocumentPublishService documentPublishService) {
        this.documentTreeService = documentTreeService;
        this.documentDraftService = documentDraftService;
        this.documentPublishService = documentPublishService;
    }

    @GetMapping("/tree")
    public CommonResponse<DocumentTreeVO> getAdminTree() {
        return CommonResponse.success(documentTreeService.getAdminTree());
    }

    @PostMapping("/directories")
    @ResponseStatus(HttpStatus.CREATED)
    public CommonResponse<DocumentOperationVO> createDirectory(@Valid @RequestBody DirectoryDTO dto) {
        return CommonResponse.success(documentTreeService.createDirectory(dto));
    }

    @PostMapping("/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public CommonResponse<DocumentOperationVO> createDocument(@Valid @RequestBody DocumentDTO dto) {
        return CommonResponse.success(documentTreeService.createDocument(dto));
    }

    @PatchMapping("/directories/{directoryId}")
    public CommonResponse<DocumentOperationVO> renameDirectory(
            @PathVariable Long directoryId,
            @Valid @RequestBody DirectoryRenameDTO dto) {
        return CommonResponse.success(documentTreeService.renameDirectory(directoryId, dto));
    }

    @PatchMapping("/nodes/{nodeId}/position")
    public CommonResponse<DocumentOperationVO> moveNode(
            @PathVariable Long nodeId,
            @Valid @RequestBody NodePositionDTO dto) {
        return CommonResponse.success(documentTreeService.moveNode(nodeId, dto));
    }

    @DeleteMapping("/nodes/{nodeId}")
    public CommonResponse<DocumentOperationVO> deleteNode(
            @PathVariable Long nodeId,
            @NotNull @RequestParam Long expectedTreeRevision) {
        return CommonResponse.success(documentTreeService.deleteNode(nodeId, expectedTreeRevision));
    }

    @GetMapping("/documents/{documentId}")
    public CommonResponse<AdminDocumentDetailVO> getDraft(@PathVariable Long documentId) {
        return CommonResponse.success(documentDraftService.getDraft(documentId));
    }

    @PutMapping("/documents/{documentId}/draft")
    public CommonResponse<DocumentOperationVO> saveDraft(
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentDraftDTO dto) {
        return CommonResponse.success(documentDraftService.saveDraft(documentId, dto));
    }

    @PostMapping("/documents/{documentId}/publish")
    public CommonResponse<DocumentOperationVO> publish(
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentPublishDTO dto) {
        return CommonResponse.success(documentPublishService.publish(documentId, dto));
    }

    @PostMapping("/documents/{documentId}/unpublish")
    public CommonResponse<DocumentOperationVO> unpublish(
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentUnpublishDTO dto) {
        return CommonResponse.success(documentPublishService.unpublish(documentId, dto));
    }
}
