import { history, useRequest } from '@umijs/max';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import { getPublishedTree } from '@/services/documentCenter';
import type { DocumentTree } from '@/types/documentCenter';

export default function DocumentCenterPage() {
  const { data: tree, loading } = useRequest(getPublishedTree);
  const typedTree = tree as DocumentTree | undefined;

  return (
    <main className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
      <aside className="w-72 shrink-0">
        <h1 className="mb-4 text-xl font-semibold text-gray-950">文档中心</h1>
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : (
          <DocumentTreePanel
            nodes={typedTree?.nodes ?? []}
            onSelect={(node) => {
              if (node.nodeType === 'DOCUMENT') {
                history.push(`/document-center/${node.id}`);
              }
            }}
          />
        )}
      </aside>
      <section className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择一篇已发布文档
      </section>
    </main>
  );
}
