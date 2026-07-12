export interface CommonResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId?: string;
}

export type DocumentNodeType = 'DIRECTORY' | 'DOCUMENT';
export type DocumentPublishState = 'DRAFT' | 'PUBLISHED' | 'PUBLISHED_WITH_CHANGES';

export interface DocumentTreeNode {
  id: string;
  nodeId?: string;
  parentId: string;
  nodeType: DocumentNodeType;
  title: string;
  name?: string;
  draftTitle?: string;
  publishedTitle?: string;
  publishedRevision?: string;
  publishState?: DocumentPublishState;
  sortOrder: number;
  published?: boolean;
  children?: DocumentTreeNode[];
}

export interface DocumentTree {
  treeRevision: string;
  defaultDocumentId?: string;
  nodes: DocumentTreeNode[];
}

export interface DocumentContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocumentContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  text?: string;
  [key: string]: unknown;
}

export interface AdminDocumentDetail {
  documentId: string;
  parentId: string;
  title: string;
  draftTitle: string;
  publishedTitle?: string;
  publishState: DocumentPublishState;
  schemaVersion: number;
  content: DocumentContent;
  draftRevision: string;
  publishedRevision?: string;
  publicationVersion?: string;
  published: boolean;
  draftUpdatedAt?: string;
  publishedAt?: string;
}

export interface PublishedDocumentDetail {
  documentId: string;
  title: string;
  schemaVersion: number;
  content: DocumentContent;
  publishedRevision: string;
  publicationVersion: string;
  publishedAt?: string;
  assets?: Record<string, {
    assetId: string;
    assetKind: 'IMAGE' | 'ATTACHMENT';
    fileName: string;
    mimeType: string;
    sizeBytes: string;
  }>;
}

export interface PublishedDocumentSearch {
  keyword: string;
  items: Array<{
    documentId: string;
    title: string;
    breadcrumb: string[];
  }>;
}

export interface DocumentAsset {
  assetId: string;
  documentId: string;
  assetKind: 'IMAGE' | 'ATTACHMENT';
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  accessUrl: string;
}

export interface DocumentOperation {
  id?: string;
  nodeId?: string;
  documentId?: string;
  draftRevision?: string;
  publishedRevision?: string;
  publicationVersion?: string;
  treeRevision?: string;
  publishState?: DocumentPublishState;
  alreadyUnpublished?: boolean;
  parentId?: string;
  sortOrder?: number;
  publishedNavigationChanged?: boolean;
}
