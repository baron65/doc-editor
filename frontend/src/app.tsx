import type { RequestConfig } from '@umijs/max';
import { toDocumentApiError } from './services/documentApiError';

export const request: RequestConfig = {
  timeout: 15000,
  errorConfig: {
    errorHandler: (error: any) => {
      throw toDocumentApiError(error);
    },
  },
};
