import { defineConfig } from '@umijs/max';

const apiProxyTarget = process.env.DOCUMENT_CENTER_API_PROXY_TARGET || 'http://localhost:8080';

export default defineConfig({
  npmClient: 'pnpm',
  metas: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no',
    },
  ],
  routes: [
    { path: '/', redirect: '/document-center' },
    { path: '/document-center', component: './document-center/index' },
    { path: '/document-center/:documentId', component: './document-center/index' },
    { path: '/admin/document-center', component: './admin/document-center/index' },
    { path: '/admin/document-center/:documentId', component: './admin/document-center/index' },
  ],
  request: {},
  fastRefresh: true,
  esbuildMinifyIIFE: true,
  alias: {
    'cytoscape/dist/cytoscape.umd.js': 'cytoscape/dist/cytoscape.esm.mjs',
  },
  proxy: {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  },
});
