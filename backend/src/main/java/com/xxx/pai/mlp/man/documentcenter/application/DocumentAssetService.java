package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentAssetDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentAssetVO;
import com.xxx.pai.mlp.man.documentcenter.domain.bo.DocumentAssetDownloadBO;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface DocumentAssetService {

    DocumentAssetVO upload(DocumentAssetDTO dto, MultipartFile file) throws IOException;

    DocumentAssetVO getAdminAsset(Long documentId, Long assetId);

    DocumentAssetVO getPublishedAsset(Long documentId, Long assetId);

    DocumentAssetDownloadBO openAdminAsset(Long documentId, Long assetId) throws IOException;

    DocumentAssetDownloadBO openPublishedAsset(Long documentId, Long assetId) throws IOException;
}
