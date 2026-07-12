package com.xxx.pai.mlp.man.documentcenter.infra.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsBusinessErrorFamiliesToTheirHttpStatuses() {
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.NOT_FOUND)).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.DOCUMENT_VERSION_CONFLICT)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.DOCUMENT_PUBLICATION_CONFLICT)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.TREE_VERSION_CONFLICT)).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.VALIDATION_FAILED)).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.INTERNAL_ERROR)).getStatusCode())
                .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.FILE_TOO_LARGE)).getStatusCode())
                .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.UNSUPPORTED_FILE_TYPE)).getStatusCode())
                .isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.CONTENT_SCHEMA_INVALID)).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(handler.handleBusinessException(error(DocumentErrorCode.OBJECT_STORAGE_UNAVAILABLE)).getStatusCode())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    private DocumentBusinessException error(DocumentErrorCode code) {
        return new DocumentBusinessException(code, "test");
    }
}
