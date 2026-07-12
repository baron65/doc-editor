import { useMemo } from 'react';
import { history, useParams, useRequest } from '@umijs/max';
import { DocumentReader } from '@/document-center/reader/DocumentReader';
import { ResponsiveDocumentTree } from '@/document-center/tree/ResponsiveDocumentTree';
import {
  getPublishedDocument,
  getPublishedTree,
  passthroughRequestResult,
} from '@/services/documentCenter';
import type { DocumentTree, PublishedDocumentDetail } from '@/types/documentCenter';
import { getDocumentNavigation } from '@/document-center/reader/readerModel';

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId ?? '';

  const treeRequest = useRequest(getPublishedTree, {
    formatResult: passthroughRequestResult,
  });
  const detailRequest = useRequest(() => getPublishedDocument(documentId), {
    formatResult: passthroughRequestResult,
    refreshDeps: [documentId],
  });
  const tree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as PublishedDocumentDetail | undefined;
  const navigation = useMemo(
    () => getDocumentNavigation(tree?.nodes ?? [], documentId),
    [documentId, tree?.nodes],
  );

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
        {detailRequest.loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : detailRequest.error ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            <div className="font-medium text-gray-700">文档不存在或已下架</div>
            <button className="mt-4 text-sm text-brand-600" type="button" onClick={() => history.push('/document-center')}>
              返回文档中心
            </button>
          </div>
        ) : (
          <DocumentReader document={document} previous={navigation.previous} next={navigation.next} />
        )}
      </section>
    </main>
  );
}
