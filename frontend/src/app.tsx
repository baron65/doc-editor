import type { RequestConfig } from '@umijs/max';

export const request: RequestConfig = {
  timeout: 15000,
  errorConfig: {
    errorHandler: (error: any) => {
      throw error;
    },
  },
};

