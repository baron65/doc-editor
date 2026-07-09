package com.xxx.pai.mlp.man.documentcenter.infra.exception;

import com.xxx.pai.mlp.man.documentcenter.client.vo.CommonResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DocumentBusinessException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public CommonResponse<Void> handleBusinessException(DocumentBusinessException exception) {
        return CommonResponse.failure(exception.getErrorCode().getCode(), exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public CommonResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        return CommonResponse.failure(DocumentErrorCode.VALIDATION_FAILED.getCode(), "request validation failed");
    }
}

