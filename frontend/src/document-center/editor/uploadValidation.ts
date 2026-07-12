type UploadKind = 'IMAGE' | 'ATTACHMENT';

interface UploadFileInfo {
  name: string;
  type: string;
  size: number;
}

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const attachmentExtensions = new Set(['pdf', 'txt', 'md', 'csv', 'docx', 'xlsx', 'pptx', 'zip']);

export function validateUploadFile(kind: UploadKind, file: UploadFileInfo) {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  if (kind === 'IMAGE') {
    if (!imageExtensions.has(extension) || !imageMimeTypes.has(file.type.toLowerCase())) {
      return '图片仅支持 JPG、PNG、WebP。';
    }
    if (file.size > 10 * 1024 * 1024) {
      return '图片不能超过 10MB。';
    }
    return undefined;
  }
  if (!attachmentExtensions.has(extension)) {
    return '附件仅支持 PDF、TXT、MD、CSV、DOCX、XLSX、PPTX、ZIP。';
  }
  if (file.size > 50 * 1024 * 1024) {
    return '附件不能超过 50MB。';
  }
  return undefined;
}
