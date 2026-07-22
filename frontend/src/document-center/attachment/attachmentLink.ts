const MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};

export function isSafeAttachmentHref(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const href = value.trim();
  if (!href || href.startsWith('//')) return false;
  if (href.startsWith('/')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

export function inferAttachmentMimeType(fileName: string) {
  const extension = fileName.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}
