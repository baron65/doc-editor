import { history, useParams, useRequest } from '@umijs/max';
import { DocumentEditorShell } from '@/document-center/editor/DocumentEditorShell';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import { getAdminDocument, getAdminTree } from '@/services/documentCenter';
import type { AdminDocumentDetail, DocumentTree } from '@/types/documentCenter';

export default function AdminDocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId ?? '';

  const treeRequest = useRequest(getAdminTree);
  const detailRequest = useRequest(() => getAdminDocument(documentId), {
    refreshDeps: [documentId],
  });
  const tree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as AdminDocumentDetail | undefined;

  return (
    <main className="flex min-h-screen bg-gray-100">
      <aside className="w-80 border-r border-gray-200 bg-white p-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-950">文档管理</h1>
        <DocumentTreePanel
          nodes={tree?.nodes ?? []}
          activeDocumentId={documentId}
          onSelect={(node) => {
            if (node.nodeType === 'DOCUMENT') {
              history.push(`/admin/document-center/${node.id}`);
            }
          }}
        />
      </aside>
      <section className="min-w-0 flex-1 p-8">
        {detailRequest.loading ? <div className="text-sm text-gray-500">加载中...</div> : <DocumentEditorShell document={document} />}
      </section>
    </main>
  );
}
