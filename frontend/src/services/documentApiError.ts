interface BackendErrorPayload {
  code?: unknown;
  message?: unknown;
}

interface RequestErrorShape {
  message?: unknown;
  data?: BackendErrorPayload;
  response?: {
    status?: unknown;
    data?: BackendErrorPayload;
  };
}

export class DocumentApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'DocumentApiError';
    this.code = code;
    this.status = status;
  }
}

export function toDocumentApiError(error: unknown) {
  if (error instanceof DocumentApiError) {
    return error;
  }
  const shape = isRecord(error) ? error as RequestErrorShape : {};
  const payload = shape.data ?? shape.response?.data;
  const code = typeof payload?.code === 'string' ? payload.code : undefined;
  const status = typeof shape.response?.status === 'number' ? shape.response.status : undefined;
  const message = typeof payload?.message === 'string'
    ? payload.message
    : typeof shape.message === 'string'
      ? shape.message
      : '请求失败，请稍后重试。';
  return new DocumentApiError(message, code, status);
}

export function isDocumentApiError(error: unknown, code: string) {
  return error instanceof DocumentApiError && error.code === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
