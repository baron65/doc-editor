package com.xxx.pai.mlp.man.documentcenter.client.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentDraftService;
import com.xxx.pai.mlp.man.documentcenter.application.DocumentPublishService;
import com.xxx.pai.mlp.man.documentcenter.application.DocumentTreeService;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class DocumentAdminControllerTest {

    @Mock private DocumentTreeService treeService;
    @Mock private DocumentDraftService draftService;
    @Mock private DocumentPublishService publishService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new DocumentAdminController(treeService, draftService, publishService)).build();
    }

    @Test
    void createEndpointsReturn201AndDesignedIdentifiers() throws Exception {
        DocumentOperationVO directory = DocumentOperationVO.empty();
        directory.setId("10");
        directory.setNodeId("10");
        DocumentOperationVO document = DocumentOperationVO.empty();
        document.setId("20");
        document.setDocumentId("20");
        when(treeService.createDirectory(any(DirectoryDTO.class))).thenReturn(directory);
        when(treeService.createDocument(any(DocumentDTO.class))).thenReturn(document);

        mockMvc.perform(post("/api/v1/document-center/admin/directories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"parentId\":0,\"name\":\"目录\",\"targetIndex\":0}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.nodeId").value("10"));
        mockMvc.perform(post("/api/v1/document-center/admin/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"parentId\":0,\"title\":\"文档\",\"targetIndex\":0}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.documentId").value("20"));
    }
}
