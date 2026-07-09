package com.xxx.pai.mlp.man.documentcenter;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.xxx.pai.mlp.man.documentcenter.domain.repository")
public class DocumentCenterApplication {

    public static void main(String[] args) {
        SpringApplication.run(DocumentCenterApplication.class, args);
    }
}

