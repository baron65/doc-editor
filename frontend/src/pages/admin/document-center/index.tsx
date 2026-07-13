import { useEffect, useMemo, useRef, useState } from 'react';
import { history, useParams, useRequest } from '@umijs/max';
import { DocumentEditorShell, type DocumentEditorShellHandle } from '@/document-center/editor/DocumentEditorShell';
import { shouldConfirmEditorNavigation } from '@/document-center/editor/editorNavigationGuard';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import { flattenTreeNodes } from '@/document-center/tree/treeManagementModel';
import {
  createDirectory,
  createDocument,
  deleteNode,
  getAdminDocument,
  getAdminTree,
  moveNode,
  passthroughRequestResult,
  renameDirectory,
  saveDraft,
} from '@/services/documentCenter';
import type { AdminDocumentDetail, DocumentTree, DocumentTreeNode } from '@/types/documentCenter';
import { useAppDialog } from '@/components/app-dialog/AppDialog';

type CreateKind = 'DOCUMENT' | 'DIRECTORY';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function AdminDocumentCenterPage() {
  const { documentId = '' } = useParams();
  const treeRequest = useRequest(getAdminTree, {
    formatResult: passthroughRequestResult,
  });
  const detailRequest = useRequest(() => getAdminDocument(documentId), {
    formatResult: passthroughRequestResult,
    refreshDeps: [documentId],
    ready: Boolean(documentId),
  });
  const typedTree = treeRequest.data as DocumentTree | undefined;
  const document = detailRequest.data as AdminDocumentDetail | undefined;
  const syncedDocumentIdRef = useRef('');
  const editorShellRef = useRef<DocumentEditorShellHandle>(null);
  const [selectedNode, setSelectedNode] = useState<DocumentTreeNode>();
  const [createKind, setCreateKind] = useState<CreateKind>();
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState('0');
  const [createParentTitle, setCreateParentTitle] = useState('根目录');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [hasPendingEditorWork, setHasPendingEditorWork] = useState(false);
  const { confirm, prompt, dialog } = useAppDialog();
  const flatNodes = useMemo(() => flattenTreeNodes(typedTree?.nodes ?? []), [typedTree?.nodes]);
  const activeDocumentNode = useMemo(
    () => flatNodes.find((node) => node.nodeType === 'DOCUMENT' && node.id === documentId),
    [documentId, flatNodes],
  );

  useEffect(() => {
    if (!documentId || !activeDocumentNode || syncedDocumentIdRef.current === documentId) {
      return;
    }
    syncedDocumentIdRef.current = documentId;
    setSelectedNode(activeDocumentNode);
  }, [activeDocumentNode, documentId]);

  useEffect(() => {
    if (documentId || treeRequest.loading) {
      return;
    }
    const firstDocument = flatNodes.find((node) => node.nodeType === 'DOCUMENT');
    if (firstDocument) {
      history.replace(`/admin/document-center/${firstDocument.id}`);
    }
  }, [documentId, flatNodes, treeRequest.loading]);

  const openCreatePanel = (kind: CreateKind, parentId: string, parentTitle = '根目录') => {
    setCreateKind(kind);
    setCreateName(kind === 'DOCUMENT' ? '新文档' : '新目录');
    setCreateParentId(parentId);
    setCreateParentTitle(parentTitle);
    setFeedback(undefined);
  };

  const handleCreateSubmit = async () => {
    if (!createKind || creating) {
      return;
    }
    const name = createName.trim();
    if (!name) {
      setFeedback({ type: 'error', message: createKind === 'DOCUMENT' ? '请输入文档标题。' : '请输入目录名称。' });
      return;
    }
    if (!typedTree?.treeRevision) {
      setFeedback({
        type: 'error',
        message: '文档树尚未加载成功，暂时无法创建。请确认后端服务已启动后刷新重试。',
      });
      return;
    }

    setCreating(true);
    setFeedback(undefined);
    try {
      const operation =
        createKind === 'DOCUMENT'
          ? await createDocument(createParentId, name, typedTree.treeRevision)
          : await createDirectory(createParentId, name, typedTree.treeRevision);
      await treeRequest.refresh();
      setCreateKind(undefined);
      setCreateName('');
      setCreateParentId('0');
      setCreateParentTitle('根目录');
      setFeedback({
        type: 'success',
        message: createKind === 'DOCUMENT' ? '文档已创建。' : '目录已创建。',
      });
      const createdDocumentId = operation.documentId ?? operation.id;
      if (createKind === 'DOCUMENT' && createdDocumentId) {
        history.push(`/admin/document-center/${createdDocumentId}`);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, createKind === 'DOCUMENT' ? '新建文档失败。' : '新建目录失败。'),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRenameNode = async (node: DocumentTreeNode) => {
    if (!typedTree?.treeRevision) {
      return;
    }
    const currentTitle = node.draftTitle ?? node.title;
    const nextName = await prompt({
      title: node.nodeType === 'DIRECTORY' ? '重命名目录' : '重命名文档',
      description: `请输入“${currentTitle}”的新名称。`,
      initialValue: currentTitle,
      confirmText: '保存名称',
      validate: (value) => value.trim() ? undefined : '名称不能为空。',
    });
    if (!nextName?.trim()) {
      return;
    }
    const normalizedName = nextName.trim();
    setFeedback(undefined);
    try {
      if (node.nodeType === 'DIRECTORY') {
        await renameDirectory(node.id, {
          name: normalizedName,
          expectedTreeRevision: typedTree.treeRevision,
        });
      } else {
        if (document?.documentId === node.id) {
          await editorShellRef.current?.renameDocumentTitle(normalizedName);
          await detailRequest.refresh();
        } else {
          const draft = await getAdminDocument(node.id);
          await saveDraft(node.id, {
            title: normalizedName,
            schemaVersion: draft.schemaVersion,
            content: draft.content,
            expectedDraftRevision: draft.draftRevision,
          });
        }
      }
      await treeRequest.refresh();
      setFeedback({ type: 'success', message: node.nodeType === 'DIRECTORY' ? '目录已重命名。' : '文档已重命名。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '重命名失败。') });
    }
  };

  const deleteTreeNode = async (node: DocumentTreeNode) => {
    if (
      !typedTree?.treeRevision
      || deleting
      || (node.nodeType === 'DOCUMENT' && node.publishState !== 'DRAFT')
    ) {
      return;
    }
    const deletingActiveDocument = node.nodeType === 'DOCUMENT' && node.id === documentId;
    const pendingWarning = deletingActiveDocument && hasPendingEditorWork
      ? '当前草稿还有未保存或保存失败的内容，'
      : '';
    const confirmed = await confirm({
      title: node.nodeType === 'DIRECTORY' ? '删除目录' : '删除草稿',
      description: node.nodeType === 'DIRECTORY'
        ? `只能删除空目录。确认永久删除目录“${node.title}”？`
        : `${pendingWarning}确认永久删除草稿“${node.draftTitle ?? node.title}”？此操作不可恢复。`,
      confirmText: '永久删除',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    setFeedback(undefined);
    try {
      const nextDocument = flatNodes.find((item) => (
        item.nodeType === 'DOCUMENT' && item.id !== node.id
      ));
      await deleteNode(node.id, typedTree.treeRevision);
      await treeRequest.refresh();
      if (deletingActiveDocument) {
        syncedDocumentIdRef.current = '';
        setSelectedNode(nextDocument);
        history.replace(nextDocument
          ? `/admin/document-center/${nextDocument.id}`
          : '/admin/document-center');
      } else if (selectedNode?.id === node.id) {
        setSelectedNode(undefined);
      }
      setFeedback({ type: 'success', message: node.nodeType === 'DIRECTORY' ? '目录已删除。' : '草稿已删除。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除节点失败。') });
    } finally {
      setDeleting(false);
    }
  };

  const handleTreeDrop = async (
    node: DocumentTreeNode,
    destination: { targetParentId: string; targetIndex: number },
  ) => {
    if (!typedTree?.treeRevision) {
      return;
    }
    setFeedback(undefined);
    try {
      await moveNode(node.id, {
        ...destination,
        expectedTreeRevision: typedTree.treeRevision,
      });
      setSelectedNode({ ...node, parentId: destination.targetParentId });
      await treeRequest.refresh();
      setFeedback({ type: 'success', message: '拖拽移动已保存。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '拖拽移动失败。') });
    }
  };

  const handleSelectNode = async (node: DocumentTreeNode) => {
    if (node.nodeType === 'DIRECTORY') {
      setSelectedNode(node);
      return;
    }
    if (
      shouldConfirmEditorNavigation(hasPendingEditorWork, documentId, node.id)
      && !await confirm({
        title: '离开当前文档？',
        description: '当前文档仍有未保存、保存失败或冲突内容，离开后这些内容可能丢失。',
        confirmText: '确认离开',
        danger: true,
      })
    ) {
      return;
    }
    setSelectedNode(node);
    if (node.id !== documentId) {
      history.push(`/admin/document-center/${node.id}`);
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <aside className="sticky top-0 h-screen w-80 shrink-0 self-start overflow-y-auto border-r border-gray-200 bg-white p-6">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-950">文档管理</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-brand-500 px-3 py-1.5 text-sm text-white"
              type="button"
              onClick={() => openCreatePanel('DOCUMENT', '0')}
            >
              新建文档
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              type="button"
              onClick={() => openCreatePanel('DIRECTORY', '0')}
            >
              新建目录
            </button>
          </div>
          {createKind && (
            <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/70 p-3">
              <div className="mb-2 text-xs font-medium text-brand-700">
                {createKind === 'DOCUMENT' ? '新建文档' : '新建目录'}
                <span className="ml-1 font-normal text-gray-500">
                  / 父级：{createParentTitle}
                </span>
              </div>
              <input
                autoFocus
                className="w-full rounded-md border border-brand-100 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500"
                disabled={creating}
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreateSubmit();
                  }
                  if (event.key === 'Escape') {
                    setCreateKind(undefined);
                    setCreateName('');
                    setCreateParentId('0');
                    setCreateParentTitle('根目录');
                  }
                }}
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  type="button"
                  disabled={creating}
                  onClick={() => void handleCreateSubmit()}
                >
                  {creating ? '创建中...' : '确认创建'}
                </button>
                <button
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 disabled:opacity-50"
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    setCreateKind(undefined);
                    setCreateName('');
                    setCreateParentId('0');
                    setCreateParentTitle('根目录');
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}
          {treeRequest.error && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <div className="font-medium">文档树加载失败</div>
              <div className="mt-1 break-words">{getErrorMessage(treeRequest.error, '请确认后端服务已启动后重试。')}</div>
              <button
                className="mt-2 rounded-md border border-red-200 bg-white px-2 py-1 text-red-700"
                type="button"
                onClick={() => void treeRequest.refresh()}
              >
                重新加载
              </button>
            </div>
          )}
          {feedback && (
            <div
              className={[
                'mt-3 rounded-lg border p-3 text-xs',
                feedback.type === 'success'
                  ? 'border-green-100 bg-green-50 text-green-700'
                  : 'border-red-100 bg-red-50 text-red-700',
              ].join(' ')}
            >
              {feedback.message}
            </div>
          )}
        </div>
        {treeRequest.loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : (
          <DocumentTreePanel
            nodes={typedTree?.nodes ?? []}
            activeDocumentId={documentId}
            activeNodeId={selectedNode?.id}
            searchable
            showPublishState
            onRenameNode={(node) => void handleRenameNode(node)}
            onDeleteNode={(node) => void deleteTreeNode(node)}
            onCreateChild={(node, kind) => openCreatePanel(kind, node.id, node.title)}
            onMoveNode={(node, destination) => void handleTreeDrop(node, destination)}
            onSelect={(node) => void handleSelectNode(node)}
          />
        )}
      </aside>
      <section className="min-w-0 flex-1">
        {documentId && detailRequest.loading ? (
          <div className="p-8 text-sm text-gray-500">加载中...</div>
        ) : documentId && detailRequest.error ? (
          <div className="m-8 rounded-xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
            <div className="font-medium">文档加载失败</div>
            <div className="mt-2 text-sm">{getErrorMessage(detailRequest.error, '文档不存在或已被删除。')}</div>
          </div>
        ) : (
          <DocumentEditorShell
            ref={editorShellRef}
            document={document}
            onDocumentChange={treeRequest.refresh}
            onPendingChange={setHasPendingEditorWork}
          />
        )}
      </section>
      {dialog}
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}
