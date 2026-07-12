import { useMemo, useState } from 'react';
import { history, useRequest } from '@umijs/max';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import {
  flattenTreeNodes,
  getMoveTargetDirectories,
  getTargetAppendIndex,
} from '@/document-center/tree/treeManagementModel';
import {
  createDirectory,
  createDocument,
  deleteNode,
  getAdminTree,
  moveNode,
  passthroughRequestResult,
  renameDirectory,
} from '@/services/documentCenter';
import type { DocumentTree, DocumentTreeNode } from '@/types/documentCenter';

type CreateKind = 'DOCUMENT' | 'DIRECTORY';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function AdminDocumentCenterPage() {
  const { data: tree, loading, refresh, error: treeError } = useRequest(getAdminTree, {
    formatResult: passthroughRequestResult,
  });
  const typedTree = tree as DocumentTree | undefined;
  const [selectedNode, setSelectedNode] = useState<DocumentTreeNode>();
  const [createKind, setCreateKind] = useState<CreateKind>();
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [moveTargetParentId, setMoveTargetParentId] = useState('0');
  const flatNodes = useMemo(() => flattenTreeNodes(typedTree?.nodes ?? []), [typedTree?.nodes]);
  const moveTargets = useMemo(
    () => getMoveTargetDirectories(typedTree?.nodes ?? [], selectedNode),
    [selectedNode, typedTree?.nodes],
  );
  const selectedSiblingInfo = useMemo(
    () => getSiblingInfo(flatNodes, selectedNode),
    [flatNodes, selectedNode],
  );

  const getCreateParentId = () => {
    if (selectedNode?.nodeType === 'DIRECTORY') {
      return selectedNode.id;
    }
    return '0';
  };

  const openCreatePanel = (kind: CreateKind) => {
    setCreateKind(kind);
    setCreateName(kind === 'DOCUMENT' ? '新文档' : '新目录');
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
          ? await createDocument(getCreateParentId(), name, typedTree.treeRevision)
          : await createDirectory(getCreateParentId(), name, typedTree.treeRevision);
      await refresh();
      setCreateKind(undefined);
      setCreateName('');
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

  const handleRenameDirectory = async () => {
    if (!selectedNode || selectedNode.nodeType !== 'DIRECTORY' || !typedTree?.treeRevision) {
      return;
    }
    const nextName = window.prompt('请输入新的目录名称', selectedNode.title);
    if (!nextName?.trim()) {
      return;
    }
    setFeedback(undefined);
    try {
      await renameDirectory(selectedNode.id, {
        name: nextName.trim(),
        expectedTreeRevision: typedTree.treeRevision,
      });
      await refresh();
      setFeedback({ type: 'success', message: '目录已重命名。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '重命名目录失败。') });
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode || !typedTree?.treeRevision) {
      return;
    }
    const confirmed = window.confirm(
      selectedNode.nodeType === 'DIRECTORY'
        ? '只能删除空目录，确认删除？'
        : '只能删除未发布文档，确认删除？',
    );
    if (!confirmed) {
      return;
    }
    setFeedback(undefined);
    try {
      await deleteNode(selectedNode.id, typedTree.treeRevision);
      setSelectedNode(undefined);
      await refresh();
      setFeedback({ type: 'success', message: '节点已删除。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '删除节点失败。') });
    }
  };

  const handleMoveSelected = async (direction: 'UP' | 'DOWN') => {
    if (!selectedNode || !typedTree?.treeRevision || selectedSiblingInfo.index < 0) {
      return;
    }
    const nextIndex = direction === 'UP' ? selectedSiblingInfo.index - 1 : selectedSiblingInfo.index + 1;
    if (nextIndex < 0 || nextIndex >= selectedSiblingInfo.siblings.length) {
      return;
    }
    setFeedback(undefined);
    try {
      await moveNode(selectedNode.id, {
        targetParentId: selectedNode.parentId,
        targetIndex: nextIndex,
        expectedTreeRevision: typedTree.treeRevision,
      });
      await refresh();
      setFeedback({ type: 'success', message: '节点顺序已更新。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '移动节点失败。') });
    }
  };

  const handleMoveToDirectory = async () => {
    if (!selectedNode || !typedTree?.treeRevision) {
      return;
    }
    setFeedback(undefined);
    try {
      await moveNode(selectedNode.id, {
        targetParentId: moveTargetParentId,
        targetIndex: getTargetAppendIndex(typedTree.nodes, moveTargetParentId, selectedNode),
        expectedTreeRevision: typedTree.treeRevision,
      });
      setSelectedNode({ ...selectedNode, parentId: moveTargetParentId });
      await refresh();
      setFeedback({ type: 'success', message: '节点已移动到目标目录末尾。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '跨目录移动失败。') });
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
      setMoveTargetParentId(destination.targetParentId);
      await refresh();
      setFeedback({ type: 'success', message: '拖拽移动已保存。' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, '拖拽移动失败。') });
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <aside className="w-80 border-r border-gray-200 bg-white p-6">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-950">文档管理</h1>
            <span className="text-xs text-gray-400">treeRevision {typedTree?.treeRevision ?? '-'}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-brand-500 px-3 py-1.5 text-sm text-white"
              type="button"
              onClick={() => openCreatePanel('DOCUMENT')}
            >
              新建文档
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              type="button"
              onClick={() => openCreatePanel('DIRECTORY')}
            >
              新建目录
            </button>
          </div>
          {createKind && (
            <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/70 p-3">
              <div className="mb-2 text-xs font-medium text-brand-700">
                {createKind === 'DOCUMENT' ? '新建文档' : '新建目录'}
                <span className="ml-1 font-normal text-gray-500">
                  / 父级：{selectedNode?.nodeType === 'DIRECTORY' ? selectedNode.title : '根目录'}
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
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}
          {treeError && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <div className="font-medium">文档树加载失败</div>
              <div className="mt-1 break-words">{getErrorMessage(treeError, '请确认后端服务已启动后重试。')}</div>
              <button
                className="mt-2 rounded-md border border-red-200 bg-white px-2 py-1 text-red-700"
                type="button"
                onClick={() => void refresh()}
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
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            <div className="mb-2 truncate">
              当前选中：{selectedNode ? `${selectedNode.nodeType === 'DIRECTORY' ? '目录' : '文档'} / ${selectedNode.title}` : '根目录'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                type="button"
                disabled={selectedNode?.nodeType !== 'DIRECTORY'}
                onClick={handleRenameDirectory}
              >
                重命名目录
              </button>
              <button
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                type="button"
                disabled={!selectedNode}
                onClick={handleDeleteNode}
              >
                删除节点
              </button>
              <button
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                type="button"
                disabled={!selectedNode || selectedSiblingInfo.index <= 0}
                onClick={() => handleMoveSelected('UP')}
              >
                上移
              </button>
              <button
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                type="button"
                disabled={
                  !selectedNode ||
                  selectedSiblingInfo.index < 0 ||
                  selectedSiblingInfo.index >= selectedSiblingInfo.siblings.length - 1
                }
                onClick={() => handleMoveSelected('DOWN')}
              >
                下移
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <select
                aria-label="目标目录"
                className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                disabled={!selectedNode}
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
                className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-700 disabled:opacity-40"
                type="button"
                disabled={!selectedNode || !moveTargets.some((target) => target.id === moveTargetParentId)}
                onClick={handleMoveToDirectory}
              >
                移动到
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : (
          <DocumentTreePanel
            nodes={typedTree?.nodes ?? []}
            activeNodeId={selectedNode?.id}
            searchable
            showPublishState
            onMoveNode={(node, destination) => void handleTreeDrop(node, destination)}
            onSelect={(node) => {
              setSelectedNode(node);
              setMoveTargetParentId(node.parentId);
              if (node.nodeType === 'DOCUMENT') {
                history.push(`/admin/document-center/${node.id}`);
              }
            }}
          />
        )}
      </aside>
      <section className="flex-1 p-8">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          请选择或新建一篇文档
        </div>
      </section>
    </main>
  );
}

function getSiblingInfo(nodes: DocumentTreeNode[], selectedNode?: DocumentTreeNode) {
  if (!selectedNode) {
    return { siblings: [] as DocumentTreeNode[], index: -1 };
  }
  const siblings = nodes
    .filter((node) => node.parentId === selectedNode.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  return {
    siblings,
    index: siblings.findIndex((node) => node.id === selectedNode.id),
  };
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
