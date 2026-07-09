package com.xxx.pai.mlp.man.documentcenter.application;

import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DirectoryRenameDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.DocumentDTO;
import com.xxx.pai.mlp.man.documentcenter.client.dto.NodePositionDTO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentOperationVO;
import com.xxx.pai.mlp.man.documentcenter.client.vo.DocumentTreeVO;

public interface DocumentTreeService {

    DocumentTreeVO getAdminTree();

    DocumentTreeVO getPublishedTree();

    DocumentOperationVO createDirectory(DirectoryDTO dto);

    DocumentOperationVO createDocument(DocumentDTO dto);

    DocumentOperationVO renameDirectory(Long directoryId, DirectoryRenameDTO dto);

    DocumentOperationVO moveNode(Long nodeId, NodePositionDTO dto);

    DocumentOperationVO deleteNode(Long nodeId, Long expectedTreeRevision);
}
