import { useEffect } from 'react';
import { history, useRequest } from '@umijs/max';
import { ResponsiveDocumentTree } from '@/document-center/tree/ResponsiveDocumentTree';
import { getPublishedTree, passthroughRequestResult } from '@/services/documentCenter';
import type { DocumentTree } from '@/types/documentCenter';

export default function DocumentCenterPage() {
  const { data: tree, loading } = useRequest(getPublishedTree, {
    formatResult: passthroughRequestResult,
  });
  const typedTree = tree as DocumentTree | undefined;

  useEffect(() => {
    if (!loading && typedTree?.defaultDocumentId) {
      history.replace(`/document-center/${typedTree.defaultDocumentId}`);
    }
  }, [loading, typedTree?.defaultDocumentId]);

  return (
    <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <ResponsiveDocumentTree
        nodes={typedTree?.nodes ?? []}
        onSelect={(node) => {
          if (node.nodeType === 'DOCUMENT') {
            history.push(`/document-center/${node.id}`);
          }
        }}
      />
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : null}
      <section className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        {typedTree?.defaultDocumentId ? '正在打开第一篇文档...' : '暂无已发布文档'}
      </section>
    </main>
  );
}
