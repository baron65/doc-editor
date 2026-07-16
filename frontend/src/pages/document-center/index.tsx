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

  useEffect(() => {
    if (!document || !documentId || !globalThis.location.hash) {
      return undefined;
    }

    let targetId = globalThis.location.hash.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch {
      return undefined;
    }

    let frame = 0;
    let attempts = 0;
    const scrollToHashTarget = () => {
      const target = globalThis.document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
      if (attempts < 10) {
        attempts += 1;
        frame = window.requestAnimationFrame(scrollToHashTarget);
      }
    };

    frame = window.requestAnimationFrame(scrollToHashTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [document?.documentId, documentId]);

  return (
    <main className="mx-auto flex h-screen max-w-[90rem] items-stretch gap-4 overflow-hidden px-4 py-6 sm:px-6 sm:py-8 xl:gap-6">
      <ResponsiveDocumentTree
        nodes={tree?.nodes ?? []}
        activeDocumentId={documentId}
        onSelect={(node) => {
          if (node.nodeType === 'DOCUMENT') {
            history.push(`/document-center/${node.id}`);
          }
        }}
      />
      <section className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
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
          <DocumentReader
            containedScroll
            document={document}
            previous={navigation.previous}
            next={navigation.next}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            {tree?.defaultDocumentId ? '正在打开第一篇文档...' : '暂无已发布文档'}
          </div>
        )}
      </section>
    </main>
  );
}
