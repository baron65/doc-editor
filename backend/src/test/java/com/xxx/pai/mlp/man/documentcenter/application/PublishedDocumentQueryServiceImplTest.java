package com.xxx.pai.mlp.man.documentcenter.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.pai.mlp.man.documentcenter.client.vo.PublishedDocumentDetailVO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentNodePO;
import com.xxx.pai.mlp.man.documentcenter.domain.po.DocumentPO;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentMapper;
import com.xxx.pai.mlp.man.documentcenter.domain.repository.DocumentNodeMapper;
import com.xxx.pai.mlp.man.documentcenter.infra.util.DocumentJsonUtils;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PublishedDocumentQueryServiceImplTest {

    @Mock
    private DocumentNodeMapper documentNodeMapper;

    @Mock
    private DocumentMapper documentMapper;

    @Test
    void publishedDetailContainsLastPublishedTimeWithOffset() {
        Long documentId = 100L;
        DocumentNodePO node = new DocumentNodePO();
        node.setId(documentId);
        node.setNodeType("DOCUMENT");
        node.setPublishedName("发布指南");
        DocumentPO document = new DocumentPO();
        document.setDocumentId(documentId);
        document.setIsPublished(1);
        document.setPublishedSchemaVersion(1);
        document.setPublishedContentJson("{\"type\":\"doc\",\"content\":[]}");
        document.setPublishedRevision(5L);
        document.setPublicationVersion(2L);
        document.setPublishedAt(LocalDateTime.of(2026, 7, 12, 9, 30));
        when(documentNodeMapper.selectById(documentId)).thenReturn(node);
        when(documentMapper.selectById(documentId)).thenReturn(document);

        PublishedDocumentQueryServiceImpl service = new PublishedDocumentQueryServiceImpl(
                documentNodeMapper,
                documentMapper,
                new DocumentJsonUtils(new ObjectMapper()));

        PublishedDocumentDetailVO result = service.getPublishedDocument(documentId);

        assertThat(result.getPublishedAt()).isEqualTo("2026-07-12T09:30:00+08:00");
    }
}
