package com.xxx.pai.mlp.man.documentcenter.infra.config;

import com.xxx.pai.mlp.man.documentcenter.infra.mybatis.DruidCompatibleLocalDateTimeTypeHandler;
import com.baomidou.mybatisplus.autoconfigure.ConfigurationCustomizer;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.TypeHandlerRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
public class MybatisTypeHandlerConfig {

    @Bean
    public ConfigurationCustomizer druidCompatibleLocalDateTimeTypeHandlerCustomizer() {
        return configuration -> {
            TypeHandlerRegistry registry = configuration.getTypeHandlerRegistry();
            DruidCompatibleLocalDateTimeTypeHandler typeHandler = new DruidCompatibleLocalDateTimeTypeHandler();
            registry.register(LocalDateTime.class, typeHandler);
            registry.register(LocalDateTime.class, JdbcType.TIMESTAMP, typeHandler);
        };
    }
}
