export type AssetScope = 'admin' | 'published';

export function buildAssetUrl(documentId: string, assetId: string, scope: AssetScope) {
  const prefix = scope === 'admin' ? '/api/v1/document-center/admin' : '/api/v1/document-center';
  return `${prefix}/documents/${documentId}/assets/${assetId}`;
}

export function formatFileSize(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Math.max(0, bytes || 0)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
