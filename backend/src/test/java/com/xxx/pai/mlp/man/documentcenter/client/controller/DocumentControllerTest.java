package com.xxx.pai.mlp.man.documentcenter.client.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentTreeService;
import com.xxx.pai.mlp.man.documentcenter.application.PublishedDocumentQueryService;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    @Mock
    private DocumentTreeService documentTreeService;

    @Mock
    private PublishedDocumentQueryService publishedDocumentQueryService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new DocumentController(documentTreeService, publishedDocumentQueryService))
                .build();
    }

    @Test
    void publishedTreeSupportsEtagAndConditionalGet() throws Exception {
        DocumentTreeVO tree = new DocumentTreeVO();
        tree.setTreeRevision("24");
        when(documentTreeService.getPublishedTree()).thenReturn(tree);

        mockMvc.perform(get("/api/v1/document-center/tree"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ETAG, "\"doc-tree-24\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, no-cache"));

        mockMvc.perform(get("/api/v1/document-center/tree")
                        .header(HttpHeaders.IF_NONE_MATCH, "\"doc-tree-24\""))
                .andExpect(status().isNotModified())
                .andExpect(header().stringValues(HttpHeaders.ETAG, "\"doc-tree-24\""))
                .andExpect(content().string(""));
    }

    @Test
    void publishedDocumentEtagUsesPublicationVersion() throws Exception {
        PublishedDocumentDetailVO detail = new PublishedDocumentDetailVO();
        detail.setDocumentId("19002");
        detail.setPublicationVersion("13");
        when(publishedDocumentQueryService.getPublishedDocument(19002L)).thenReturn(detail);

        mockMvc.perform(get("/api/v1/document-center/documents/19002"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ETAG, "\"doc-19002-13\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, no-cache"));

        mockMvc.perform(get("/api/v1/document-center/documents/19002")
                        .header(HttpHeaders.IF_NONE_MATCH, "\"doc-19002-13\""))
                .andExpect(status().isNotModified())
                .andExpect(header().stringValues(HttpHeaders.ETAG, "\"doc-19002-13\""))
                .andExpect(content().string(""));
    }
}
