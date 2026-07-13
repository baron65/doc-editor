import { useEffect, useMemo } from 'react';
import { history, useParams, useRequest } from '@umijs/max';
import { DocumentReader } from '@/document-center/reader/DocumentReader';
import { getDocumentNavigation } from '@/document-center/reader/readerModel';
import { ResponsiveDocumentTree } from '@/document-center/tree/ResponsiveDocumentTree';
import {
  getPublishedDocument,
  getPublishedTree,
  passthroughRequestResult,
} from '@/services/documentCenter';
import type { DocumentTree, PublishedDocumentDetail } from '@/types/documentCenter';

export default function DocumentCenterPage() {
  const { documentId = '' } = useParams();
  const treeRequest = useRequest(getPublishedTree, {
    formatResult: passthroughRequestResult,
  });
  const detailRequest = useRequest(() => getPublishedDocument(documentId), {
    formatResult: passthroughRequestResult,
    refreshDeps: [documentId],
    ready: Boolean(documentId),
  });
  const tree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as PublishedDocumentDetail | undefined;
  const navigation = useMemo(
    () => getDocumentNavigation(tree?.nodes ?? [], documentId),
    [documentId, tree?.nodes],
  );

  useEffect(() => {
    if (!documentId && !treeRequest.loading && tree?.defaultDocumentId) {
      history.replace(`/document-center/${tree.defaultDocumentId}`);
    }
  }, [documentId, tree?.defaultDocumentId, treeRequest.loading]);

  return (
    <main className="mx-auto flex max-w-[90rem] gap-4 px-4 py-6 sm:px-6 sm:py-8 xl:gap-6">
      <ResponsiveDocumentTree
        nodes={tree?.nodes ?? []}
        activeDocumentId={documentId}
        onSelect={(node) => {
          if (node.nodeType === 'DOCUMENT') {
            history.push(`/document-center/${node.id}`);
          }
        }}
      />
      <section className="min-w-0 flex-1">
        {treeRequest.loading || (documentId && detailRequest.loading) ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : documentId && detailRequest.error ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            <div className="font-medium text-gray-700">文档不存在或已下架</div>
            <button
              className="mt-4 text-sm text-brand-600"
              type="button"
              onClick={() => history.replace('/document-center')}
            >
              打开默认文档
            </button>
          </div>
        ) : documentId ? (
          <DocumentReader document={document} previous={navigation.previous} next={navigation.next} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            {tree?.defaultDocumentId ? '正在打开第一篇文档...' : '暂无已发布文档'}
          </div>
        )}
      </section>
    </main>
  );
}
