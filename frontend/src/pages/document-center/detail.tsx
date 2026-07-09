import { history, useParams, useRequest } from '@umijs/max';
import { DocumentReader } from '@/document-center/reader/DocumentReader';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import { getPublishedDocument, getPublishedTree } from '@/services/documentCenter';
import type { DocumentTree, PublishedDocumentDetail } from '@/types/documentCenter';

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId ?? '';

  const treeRequest = useRequest(getPublishedTree);
  const detailRequest = useRequest(() => getPublishedDocument(documentId), {
    refreshDeps: [documentId],
  });
  const tree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as PublishedDocumentDetail | undefined;

  return (
    <main className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
      <aside className="w-72 shrink-0">
        <h1 className="mb-4 text-xl font-semibold text-gray-950">文档中心</h1>
        <DocumentTreePanel
          nodes={tree?.nodes ?? []}
          activeDocumentId={documentId}
          onSelect={(node) => {
            if (node.nodeType === 'DOCUMENT') {
              history.push(`/document-center/${node.id}`);
            }
          }}
        />
      </aside>
      <section className="min-w-0 flex-1">
        {detailRequest.loading ? <div className="text-sm text-gray-500">加载中...</div> : <DocumentReader document={document} />}
      </section>
    </main>
  );
}
