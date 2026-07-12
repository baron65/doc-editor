import { request } from '@umijs/max';
import type {
  AdminDocumentDetail,
  CommonResponse,
  DocumentAsset,
  DocumentContent,
  DocumentOperation,
  DocumentTree,
  PublishedDocumentDetail,
  PublishedDocumentSearch,
} from '@/types/documentCenter';
import { DocumentApiError } from './documentApiError';

function unwrap<T>(response: CommonResponse<T>): T {
  if (response.code !== '0') {
    throw new DocumentApiError(response.message || `Request failed: ${response.code}`, response.code);
  }
  return response.data;
}

export function passthroughRequestResult<T>(result: T): T {
  return result;
}

export async function getPublishedTree() {
  return unwrap(await request<CommonResponse<DocumentTree>>('/api/v1/document-center/tree'));
}

export async function getPublishedDocument(documentId: string) {
  return unwrap(
    await request<CommonResponse<PublishedDocumentDetail>>(
      `/api/v1/document-center/documents/${documentId}`,
    ),
  );
}

export async function searchPublishedDocuments(q: string, limit = 20) {
  return unwrap(
    await request<CommonResponse<PublishedDocumentSearch>>('/api/v1/document-center/search', {
      params: { q, limit },
    }),
  );
}

export async function getAdminTree() {
  return unwrap(await request<CommonResponse<DocumentTree>>('/api/v1/document-center/admin/tree'));
}

export async function getAdminDocument(documentId: string) {
  return unwrap(
    await request<CommonResponse<AdminDocumentDetail>>(
      `/api/v1/document-center/admin/documents/${documentId}`,
    ),
  );
}

export async function createDocument(parentId: string, title: string, expectedTreeRevision?: string, targetIndex?: number) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>('/api/v1/document-center/admin/documents', {
      method: 'POST',
      data: {
        parentId: Number(parentId),
        title,
        expectedTreeRevision: expectedTreeRevision ? Number(expectedTreeRevision) : undefined,
        targetIndex,
      },
    }),
  );
}

export async function createDirectory(parentId: string, name: string, expectedTreeRevision?: string, targetIndex?: number) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>('/api/v1/document-center/admin/directories', {
      method: 'POST',
      data: {
        parentId: Number(parentId),
        name,
        expectedTreeRevision: expectedTreeRevision ? Number(expectedTreeRevision) : undefined,
        targetIndex,
      },
    }),
  );
}

export async function renameDirectory(
  directoryId: string,
  payload: {
    name: string;
    expectedTreeRevision: string;
  },
) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/directories/${directoryId}`,
      {
        method: 'PATCH',
        data: {
          name: payload.name,
          expectedTreeRevision: Number(payload.expectedTreeRevision),
        },
      },
    ),
  );
}

export async function moveNode(
  nodeId: string,
  payload: {
    targetParentId: string;
    targetIndex: number;
    expectedTreeRevision: string;
  },
) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/nodes/${nodeId}/position`,
      {
        method: 'PATCH',
        data: {
          targetParentId: Number(payload.targetParentId),
          targetIndex: payload.targetIndex,
          expectedTreeRevision: Number(payload.expectedTreeRevision),
        },
      },
    ),
  );
}

export async function deleteNode(nodeId: string, expectedTreeRevision: string) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/nodes/${nodeId}`,
      {
        method: 'DELETE',
        params: {
          expectedTreeRevision: Number(expectedTreeRevision),
        },
      },
    ),
  );
}

export async function saveDraft(
  documentId: string,
  payload: {
    title: string;
    schemaVersion: number;
    content: DocumentContent;
    expectedDraftRevision: string;
  },
) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/documents/${documentId}/draft`,
      {
        method: 'PUT',
        data: {
          ...payload,
          expectedDraftRevision: Number(payload.expectedDraftRevision),
        },
      },
    ),
  );
}

export async function publishDocument(
  documentId: string,
  payload: {
    expectedDraftRevision: string;
    expectedPublicationVersion?: string;
  },
) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/documents/${documentId}/publish`,
      {
        method: 'POST',
        data: {
          expectedDraftRevision: Number(payload.expectedDraftRevision),
          expectedPublicationVersion: payload.expectedPublicationVersion
            ? Number(payload.expectedPublicationVersion)
            : undefined,
        },
      },
    ),
  );
}

export async function unpublishDocument(
  documentId: string,
  payload: {
    expectedPublicationVersion: string;
  },
) {
  return unwrap(
    await request<CommonResponse<DocumentOperation>>(
      `/api/v1/document-center/admin/documents/${documentId}/unpublish`,
      {
        method: 'POST',
        data: {
          expectedPublicationVersion: Number(payload.expectedPublicationVersion),
        },
      },
    ),
  );
}

export async function uploadDocumentAsset(
  documentId: string,
  assetKind: 'IMAGE' | 'ATTACHMENT',
  file: File,
) {
  const formData = new FormData();
  formData.append(
    'meta',
    new Blob([JSON.stringify({ assetKind })], { type: 'application/json' }),
  );
  formData.append('file', file);
  return unwrap(
    await request<CommonResponse<DocumentAsset>>(
      `/api/v1/document-center/admin/documents/${documentId}/assets`,
      {
        method: 'POST',
        data: formData,
      },
    ),
  );
}
