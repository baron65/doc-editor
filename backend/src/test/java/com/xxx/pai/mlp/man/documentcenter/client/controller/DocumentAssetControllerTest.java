package com.xxx.pai.mlp.man.documentcenter.client.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.xxx.pai.mlp.man.documentcenter.application.DocumentAssetService;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.DocumentAssetDownloadBO;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class DocumentAssetControllerTest {

    @Mock
    private DocumentAssetService documentAssetService;

    @Test
    void getPublishedAssetReturnsBinaryDownloadResponse() throws Exception {
        Long documentId = 100L;
        Long assetId = 800L;
        when(documentAssetService.openPublishedAsset(documentId, assetId)).thenReturn(new DocumentAssetDownloadBO(
                new ByteArrayInputStream("image-bytes".getBytes()),
                "架构 图.png",
                "image/png",
                11L,
                true));
        DocumentAssetController controller = new DocumentAssetController(documentAssetService);

        ResponseEntity<InputStreamResource> response = controller.getPublishedAsset(documentId, assetId);

        assertThat(response.getStatusCodeValue()).isEqualTo(200);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("image/png");
        assertThat(response.getHeaders().getContentLength()).isEqualTo(11L);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("inline")
                .contains("filename*=");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getBody()).isNotNull();
    }
}
