import { useMemo, useState } from 'react';
import { history, useRequest } from '@umijs/max';
import { DocumentTreePanel } from '@/document-center/tree/DocumentTreePanel';
import {
  createDirectory,
  createDocument,
  deleteNode,
  getAdminTree,
  moveNode,
  renameDirectory,
} from '@/services/documentCenter';
import type { DocumentTree, DocumentTreeNode } from '@/types/documentCenter';

export default function AdminDocumentCenterPage() {
  const { data: tree, loading, refresh } = useRequest(getAdminTree);
  const typedTree = tree as DocumentTree | undefined;
  const [selectedNode, setSelectedNode] = useState<DocumentTreeNode>();
  const flatNodes = useMemo(() => flattenNodes(typedTree?.nodes ?? []), [typedTree?.nodes]);
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

  const handleCreateDocument = async () => {
    const operation = await createDocument(getCreateParentId(), '新文档', typedTree?.treeRevision);
    await refresh();
    if (operation.id) {
      history.push(`/admin/document-center/${operation.id}`);
    }
  };

  const handleCreateDirectory = async () => {
    await createDirectory(getCreateParentId(), '新目录', typedTree?.treeRevision);
    await refresh();
  };

  const handleRenameDirectory = async () => {
    if (!selectedNode || selectedNode.nodeType !== 'DIRECTORY' || !typedTree?.treeRevision) {
      return;
    }
    const nextName = window.prompt('请输入新的目录名称', selectedNode.title);
    if (!nextName?.trim()) {
      return;
    }
    await renameDirectory(selectedNode.id, {
      name: nextName.trim(),
      expectedTreeRevision: typedTree.treeRevision,
    });
    await refresh();
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
    await deleteNode(selectedNode.id, typedTree.treeRevision);
    setSelectedNode(undefined);
    await refresh();
  };

  const handleMoveSelected = async (direction: 'UP' | 'DOWN') => {
    if (!selectedNode || !typedTree?.treeRevision || selectedSiblingInfo.index < 0) {
      return;
    }
    const nextIndex = direction === 'UP' ? selectedSiblingInfo.index - 1 : selectedSiblingInfo.index + 1;
    if (nextIndex < 0 || nextIndex >= selectedSiblingInfo.siblings.length) {
      return;
    }
    await moveNode(selectedNode.id, {
      targetParentId: selectedNode.parentId,
      targetIndex: nextIndex,
      expectedTreeRevision: typedTree.treeRevision,
    });
    await refresh();
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
              onClick={handleCreateDocument}
            >
              新建文档
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              type="button"
              onClick={handleCreateDirectory}
            >
              新建目录
            </button>
          </div>
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
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : (
          <DocumentTreePanel
            nodes={typedTree?.nodes ?? []}
            activeNodeId={selectedNode?.id}
            onSelect={(node) => {
              setSelectedNode(node);
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

function flattenNodes(nodes: DocumentTreeNode[]): DocumentTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
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
