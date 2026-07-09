export interface CommonResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId?: string;
}

export type DocumentNodeType = 'DIRECTORY' | 'DOCUMENT';

export interface DocumentTreeNode {
  id: string;
  parentId: string;
  nodeType: DocumentNodeType;
  title: string;
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
  title: string;
  schemaVersion: number;
  content: DocumentContent;
  draftRevision: string;
  publishedRevision?: string;
  publicationVersion?: string;
  published: boolean;
}

export interface PublishedDocumentDetail {
  documentId: string;
  title: string;
  schemaVersion: number;
  content: DocumentContent;
  publishedRevision: string;
  publicationVersion: string;
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
  draftRevision?: string;
  publishedRevision?: string;
  publicationVersion?: string;
  treeRevision?: string;
  publishState?: 'DRAFT' | 'PUBLISHED';
  alreadyUnpublished?: boolean;
  parentId?: string;
  sortOrder?: number;
  publishedNavigationChanged?: boolean;
}
