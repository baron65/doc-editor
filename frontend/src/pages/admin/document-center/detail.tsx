import { useEffect, useMemo, useState } from 'react';
import { history, useParams, useRequest } from '@umijs/max';
import { DocumentEditorShell } from '@/document-center/editor/DocumentEditorShell';
import { shouldConfirmEditorNavigation } from '@/document-center/editor/editorNavigationGuard';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import {
  flattenTreeNodes,
  getMoveTargetDirectories,
  getTargetAppendIndex,
} from '@/document-center/tree/treeManagementModel';
import {
  getAdminDocument,
  getAdminTree,
  moveNode,
  passthroughRequestResult,
} from '@/services/documentCenter';
import type { AdminDocumentDetail, DocumentTree, DocumentTreeNode } from '@/types/documentCenter';

export default function AdminDocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId ?? '';

  const treeRequest = useRequest(getAdminTree, {
    formatResult: passthroughRequestResult,
  });
  const detailRequest = useRequest(() => getAdminDocument(documentId), {
    formatResult: passthroughRequestResult,
    refreshDeps: [documentId],
  });
  const tree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as AdminDocumentDetail | undefined;
  const activeNode = useMemo(
    () => flattenTreeNodes(tree?.nodes ?? []).find((node) => node.id === documentId),
    [documentId, tree?.nodes],
  );
  const moveTargets = useMemo(
    () => getMoveTargetDirectories(tree?.nodes ?? [], activeNode),
    [activeNode, tree?.nodes],
  );
  const [moveTargetParentId, setMoveTargetParentId] = useState('0');
  const [moving, setMoving] = useState(false);
  const [moveFeedback, setMoveFeedback] = useState('');
  const [hasPendingEditorWork, setHasPendingEditorWork] = useState(false);

  useEffect(() => {
    if (activeNode) {
      setMoveTargetParentId(activeNode.parentId);
    }
  }, [activeNode?.id, activeNode?.parentId]);

  const handleMoveDocument = async () => {
    if (!activeNode || !tree?.treeRevision || moving) {
      return;
    }
    setMoving(true);
    setMoveFeedback('');
    try {
      await moveNode(activeNode.id, {
        targetParentId: moveTargetParentId,
        targetIndex: getTargetAppendIndex(tree.nodes, moveTargetParentId, activeNode),
        expectedTreeRevision: tree.treeRevision,
      });
      await treeRequest.refresh();
      setMoveFeedback('文档已移动到目标目录末尾。');
    } catch (error) {
      setMoveFeedback(error instanceof Error ? error.message : '移动文档失败。');
    } finally {
      setMoving(false);
    }
  };

  const handleTreeDrop = async (
    node: DocumentTreeNode,
    destination: { targetParentId: string; targetIndex: number },
  ) => {
    if (!tree?.treeRevision || moving) {
      return;
    }
    setMoving(true);
    setMoveFeedback('');
    try {
      await moveNode(node.id, {
        ...destination,
        expectedTreeRevision: tree.treeRevision,
      });
      if (node.id === activeNode?.id) {
        setMoveTargetParentId(destination.targetParentId);
      }
      await treeRequest.refresh();
      setMoveFeedback('拖拽移动已保存。');
    } catch (error) {
      setMoveFeedback(error instanceof Error ? error.message : '拖拽移动失败。');
    } finally {
      setMoving(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <aside className="w-80 border-r border-gray-200 bg-white p-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-950">文档管理</h1>
        {activeNode ? (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <label className="mb-1 block font-medium" htmlFor="document-move-target">移动当前文档</label>
            <div className="flex gap-2">
              <select
                id="document-move-target"
                className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                value={moveTargetParentId}
                onChange={(event) => setMoveTargetParentId(event.target.value)}
              >
                {moveTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {`${'　'.repeat(Math.max(0, target.depth - 1))}${target.title}`}
                  </option>
                ))}
              </select>
              <button
                className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 disabled:opacity-40"
                type="button"
                disabled={moving || moveTargetParentId === activeNode.parentId}
                onClick={handleMoveDocument}
              >
                {moving ? '移动中' : '移动'}
              </button>
            </div>
            {moveFeedback ? <div className="mt-2 break-words">{moveFeedback}</div> : null}
          </div>
        ) : null}
        <DocumentTreePanel
          nodes={tree?.nodes ?? []}
          activeDocumentId={documentId}
          searchable
          showPublishState
          onMoveNode={(node, destination) => void handleTreeDrop(node, destination)}
          onSelect={(node) => {
            if (node.nodeType === 'DOCUMENT') {
              if (
                shouldConfirmEditorNavigation(hasPendingEditorWork, documentId, node.id)
                && !window.confirm('当前文档仍有未保存、保存失败或冲突内容，确认离开吗？')
              ) {
                return;
              }
              history.push(`/admin/document-center/${node.id}`);
            }
          }}
        />
      </aside>
      <section className="min-w-0 flex-1 p-8">
        {detailRequest.loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : (
          <DocumentEditorShell document={document} onPendingChange={setHasPendingEditorWork} />
        )}
      </section>
    </main>
  );
}
