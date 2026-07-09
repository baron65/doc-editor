package com.xxx.pai.mlp.man.documentcenter.infra.storage;

import com.xxx.pai.mlp.man.documentcenter.infra.config.DocumentCenterProperties;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Component
@ConditionalOnProperty(prefix = "document-center.storage", name = "type", havingValue = "s3", matchIfMissing = true)
public class S3DocumentObjectStorage implements DocumentObjectStorage, InitializingBean, DisposableBean {

    private final DocumentCenterProperties properties;
    private final S3Client s3Client;

    public S3DocumentObjectStorage(DocumentCenterProperties properties) {
        this.properties = properties;
        DocumentCenterProperties.S3 s3 = properties.getStorage().getS3();
        this.s3Client = S3Client.builder()
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())))
                .region(Region.of(s3.getRegion()))
                .endpointOverride(URI.create(s3.getEndpoint()))
                .serviceConfiguration(configuration -> configuration.pathStyleAccessEnabled(s3.isPathStyleAccess()))
                .build();
    }

    @Override
    public void afterPropertiesSet() {
        ensureBucket();
    }

    @Override
    public StoredObject put(String storageKey, InputStream stream, long declaredSize, String contentType) throws IOException {
        validateStorageKey(storageKey);
        if (declaredSize < 0) {
            throw new IOException("S3 object size must be known before upload");
        }
        String resolvedContentType = StringUtils.hasText(contentType) ? contentType : "application/octet-stream";
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket())
                .key(storageKey)
                .contentType(resolvedContentType)
                .contentLength(declaredSize)
                .build();
        s3Client.putObject(request, RequestBody.fromInputStream(stream, declaredSize));
        return new StoredObject(storageKey, declaredSize, resolvedContentType, publicUrl(storageKey));
    }

    @Override
    public ObjectStream get(String storageKey) {
        validateStorageKey(storageKey);
        ResponseInputStream<GetObjectResponse> objectStream = s3Client.getObject(GetObjectRequest.builder()
                .bucket(bucket())
                .key(storageKey)
                .build());
        GetObjectResponse response = objectStream.response();
        String contentType = StringUtils.hasText(response.contentType())
                ? response.contentType()
                : "application/octet-stream";
        Long contentLength = response.contentLength();
        return new ObjectStream(objectStream, contentType, contentLength == null ? -1L : contentLength);
    }

    @Override
    public void delete(String storageKey) {
        validateStorageKey(storageKey);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket())
                .key(storageKey)
                .build());
    }

    @Override
    public void destroy() {
        s3Client.close();
    }

    private void ensureBucket() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder()
                    .bucket(bucket())
                    .build());
        } catch (NoSuchBucketException e) {
            s3Client.createBucket(CreateBucketRequest.builder()
                    .bucket(bucket())
                    .build());
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                s3Client.createBucket(CreateBucketRequest.builder()
                        .bucket(bucket())
                        .build());
                return;
            }
            throw e;
        }
    }

    private String bucket() {
        return properties.getStorage().getS3().getBucket();
    }

    private String publicUrl(String storageKey) {
        return properties.getStorage().getPublicBasePath() + "/" + encodeStorageKey(storageKey);
    }

    private void validateStorageKey(String storageKey) {
        if (!StringUtils.hasText(storageKey)) {
            throw new IllegalArgumentException("Storage key must not be blank");
        }
        if (storageKey.startsWith("/") || storageKey.contains("..") || storageKey.contains("\\")) {
            throw new IllegalArgumentException("Invalid storage key");
        }
    }

    private String encodeStorageKey(String storageKey) {
        return Arrays.stream(storageKey.split("/"))
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .collect(Collectors.joining("/"));
    }
}
