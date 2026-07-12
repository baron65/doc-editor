package com.xxx.pai.mlp.man.documentcenter.infra.exception;

import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DocumentBusinessException.class)
    public ResponseEntity<CommonResponse<Void>> handleBusinessException(DocumentBusinessException exception) {
        return ResponseEntity.status(resolveStatus(exception.getErrorCode()))
                .body(CommonResponse.failure(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public CommonResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        return CommonResponse.failure(DocumentErrorCode.VALIDATION_FAILED.getCode(), "request validation failed");
    }

    private HttpStatus resolveStatus(DocumentErrorCode errorCode) {
        switch (errorCode) {
            case NOT_FOUND:
            case DOCUMENT_NOT_FOUND:
            case ASSET_NOT_FOUND:
                return HttpStatus.NOT_FOUND;
            case CONFLICT:
            case DOCUMENT_VERSION_CONFLICT:
            case DOCUMENT_PUBLICATION_CONFLICT:
            case TREE_VERSION_CONFLICT:
            case DUPLICATE_DRAFT_NAME:
            case DUPLICATE_PUBLISHED_NAME:
            case DIRECTORY_NOT_EMPTY:
            case PUBLISHED_DOCUMENT_CANNOT_DELETE:
            case ASSET_NOT_READY:
                return HttpStatus.CONFLICT;
            case FILE_TOO_LARGE:
            case CONTENT_TOO_LARGE:
                return HttpStatus.PAYLOAD_TOO_LARGE;
            case UNSUPPORTED_FILE_TYPE:
                return HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            case CONTENT_SCHEMA_INVALID:
                return HttpStatus.UNPROCESSABLE_ENTITY;
            case OBJECT_STORAGE_UNAVAILABLE:
                return HttpStatus.SERVICE_UNAVAILABLE;
            case STORAGE_ERROR:
            case INTERNAL_ERROR:
            case DOCUMENT_OPERATION_FAILED:
                return HttpStatus.INTERNAL_SERVER_ERROR;
            default:
                return HttpStatus.BAD_REQUEST;
        }
    }
}
