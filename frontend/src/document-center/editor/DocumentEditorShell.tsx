import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import { DOCUMENT_SCHEMA_VERSION, emptyDocumentContent } from '@/document-center/schema/documentSchema';
import { DocumentReader } from '@/document-center/reader/DocumentReader';
import { validateMermaidSyntax } from '@/document-center/content/contentValidation';
import {
  publishDocument,
  saveDraft,
  unpublishDocument,
  uploadDocumentAsset,
} from '@/services/documentCenter';
import type { AdminDocumentDetail, DocumentContent, DocumentPublishState } from '@/types/documentCenter';
import { DraftSaveCoordinator } from './DraftSaveCoordinator';
import { createDocumentExtensions } from './documentExtensions';
import { getPublishActionPresentation } from './editorPublishState';
import { isDocumentApiError } from '@/services/documentApiError';
import { validateUploadFile } from './uploadValidation';
import { BlockContextToolbar } from './BlockContextToolbar';
import { TableContextToolbar } from './TableContextToolbar';
import { useAppDialog } from '@/components/app-dialog/AppDialog';
import { normalizeMermaidCodeBlocks } from '../content/mermaidContent';

interface DocumentEditorShellProps {
  document?: AdminDocumentDetail;
  onPendingChange?: (pending: boolean) => void;
  onDocumentChange?: () => unknown | Promise<unknown>;
}

interface DraftSnapshot {
  title: string;
  content: DocumentContent;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed' | 'conflict';

export function DocumentEditorShell({ document, onPendingChange, onDocumentChange }: DocumentEditorShellProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const imageActionRef = useRef<'insert' | 'replace'>('insert');
  const imageTargetPositionRef = useRef<number>();
  const attachmentTargetPositionRef = useRef<number>();
  const draftRevisionRef = useRef('0');
  const dirtyRef = useRef(false);
  const hydratingRef = useRef(false);
  const conflictRef = useRef(false);
  const onDocumentChangeRef = useRef(onDocumentChange);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<DocumentContent>(emptyDocumentContent);
  const [publicationVersion, setPublicationVersion] = useState<string>();
  const [published, setPublished] = useState(false);
  const [publishState, setPublishState] = useState<DocumentPublishState>('DRAFT');
  const [status, setStatus] = useState('当前为 Tiptap 编辑器基线，可继续扩展图片、附件和 Mermaid 节点。');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, prompt, dialog } = useAppDialog();

  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  const notifyDocumentChange = () => {
    void Promise.resolve(onDocumentChangeRef.current?.()).catch(() => undefined);
  };

  const markDirty = () => {
    dirtyRef.current = true;
    setDirty(true);
    if (!conflictRef.current) {
      setSaveState('dirty');
    }
  };

  const saveCoordinator = useMemo(
    () => new DraftSaveCoordinator<DraftSnapshot>(async (snapshot) => {
      if (!document) {
        return;
      }
      setSaveState('saving');
      try {
        const operation = await saveDraft(document.documentId, {
          title: snapshot.title,
          schemaVersion: DOCUMENT_SCHEMA_VERSION,
          content: snapshot.content,
          expectedDraftRevision: draftRevisionRef.current,
        });
        if (operation.draftRevision) {
          draftRevisionRef.current = operation.draftRevision;
        }
        if (operation.publicationVersion) {
          setPublicationVersion(operation.publicationVersion);
        }
        setPublishState((current) => current === 'DRAFT' ? 'DRAFT' : 'PUBLISHED_WITH_CHANGES');
        setSaveState('saved');
        setErrorMessage(undefined);
        setStatus('草稿已自动保存。');
        notifyDocumentChange();
      } catch (error) {
        const message = error instanceof Error ? error.message : '草稿保存失败。';
        const isConflict = isDocumentApiError(error, 'DOCUMENT_VERSION_CONFLICT');
        conflictRef.current = isConflict;
        setSaveState(isConflict ? 'conflict' : 'failed');
        const visibleMessage = isConflict
          ? '检测到编辑冲突，已停止自动保存。请复制当前内容并刷新后合并。'
          : `草稿保存失败：${message}`;
        setErrorMessage(visibleMessage);
        setStatus(visibleMessage);
        throw error;
      }
    }),
    [document?.documentId],
  );

  const extensions = useMemo(createDocumentExtensions, [createDocumentExtensions]);

  const editor = useEditor({
    extensions,
    content: emptyDocumentContent,
    editorProps: {
      attributes: {
        class:
          'document-body document-editor min-h-[320px] rounded-xl border border-gray-200 bg-white py-4 pr-5 pl-14 outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setContent(currentEditor.getJSON() as DocumentContent);
      if (!hydratingRef.current) {
        markDirty();
      }
    },
  }, [extensions]);

  useEffect(() => {
    if (!document) {
      return;
    }
    const nextContent = normalizeMermaidCodeBlocks(document.content ?? emptyDocumentContent);
    hydratingRef.current = true;
    conflictRef.current = false;
    dirtyRef.current = false;
    setTitle(document.title);
    setContent(nextContent);
    draftRevisionRef.current = document.draftRevision;
    setPublicationVersion(document.publicationVersion);
    setPublished(document.published);
    setPublishState(document.publishState);
    setDirty(false);
    setSaveState('saved');
    setErrorMessage(undefined);
    setStatus(document.published ? '线上稿已发布，可继续编辑草稿。' : '当前为草稿态。');
    editor?.commands.setContent(nextContent);
    hydratingRef.current = false;
  }, [document, editor]);

  useEffect(() => {
    if (!dirty || conflictRef.current || !document) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      dirtyRef.current = false;
      setDirty(false);
      saveCoordinator.enqueue({ title, content });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [content, dirty, document, saveCoordinator, title]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !saveCoordinator.hasPendingWork()) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [saveCoordinator]);

  useEffect(() => {
    const pending = dirty || saveState === 'dirty' || saveState === 'saving'
      || saveState === 'failed' || saveState === 'conflict';
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [dirty, onPendingChange, saveState]);

  useEffect(() => {
    if (!previewOpen) {
      return undefined;
    }
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      globalThis.document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewOpen]);

  if (!document) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择一篇文档
      </div>
    );
  }

  const publishAction = getPublishActionPresentation(publishState);

  const validateAndFlushDraft = async () => {
    const validation = await validateMermaidSyntax(content);
    if (!validation.valid) {
      setStatus(
        `第 ${(validation.blockIndex ?? 0) + 1} 个 Mermaid 块语法错误：${validation.message ?? '请检查源码。'}`,
      );
      setErrorMessage(
        `发布前校验失败：第 ${(validation.blockIndex ?? 0) + 1} 个 Mermaid 块语法错误：${validation.message ?? '请检查源码。'}`,
      );
      return false;
    }
    if (dirtyRef.current) {
      dirtyRef.current = false;
      setDirty(false);
      saveCoordinator.enqueue({ title, content });
    }
    await saveCoordinator.flush();
    return true;
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      if (await validateAndFlushDraft()) {
        setPreviewOpen(true);
        setErrorMessage(undefined);
        setStatus('草稿已保存，正在使用用户端 Reader 预览。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '打开预览失败。';
      setErrorMessage(`预览失败：${message}`);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      if (!(await validateAndFlushDraft())) {
        return;
      }
      const operation = await publishDocument(document.documentId, {
        expectedDraftRevision: draftRevisionRef.current,
        expectedPublicationVersion: publicationVersion,
      });
      if (operation.draftRevision) {
        draftRevisionRef.current = operation.draftRevision;
      }
      if (operation.publicationVersion) {
        setPublicationVersion(operation.publicationVersion);
      }
      setPublished(true);
      setPublishState('PUBLISHED');
      setErrorMessage(undefined);
      setStatus('文档已发布。');
      notifyDocumentChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : '文档发布失败。';
      setErrorMessage(`发布失败：${message}`);
      setStatus(`发布失败：${message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async () => {
    setBusy(true);
    try {
      const operation = await unpublishDocument(document.documentId, {
        expectedPublicationVersion: publicationVersion ?? '0',
      });
      if (operation.publicationVersion) {
        setPublicationVersion(operation.publicationVersion);
      }
      setPublished(false);
      setPublishState('DRAFT');
      setErrorMessage(undefined);
      setStatus(
        operation.alreadyUnpublished
          ? '文档已是草稿态，无需重复下架。'
          : '文档已下架。',
      );
      notifyDocumentChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : '文档下架失败。';
      setErrorMessage(`下架失败：${message}`);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const setLink = async () => {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = await prompt({
      title: '设置链接',
      description: '请输入 http、https、mailto 或站内锚点链接。留空会移除现有链接。',
      initialValue: previousUrl ?? 'https://',
      placeholder: 'https://example.com',
      confirmText: '应用链接',
    });
    if (url === undefined) {
      return;
    }
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !editor) {
      return;
    }
    const validationError = validateUploadFile('IMAGE', file);
    if (validationError) {
      setStatus(validationError);
      imageActionRef.current = 'insert';
      return;
    }
    setBusy(true);
    try {
      const asset = await uploadDocumentAsset(document.documentId, 'IMAGE', file);
      if (imageActionRef.current === 'replace' && editor.isActive('image')) {
        editor.chain().focus().updateAttributes('image', {
          src: asset.accessUrl,
          assetId: asset.assetId,
          title: asset.originalName,
        }).run();
        setStatus('图片已替换，自动保存后会更新草稿资源引用。');
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(imageTargetPositionRef.current ?? editor.state.selection.from, {
            type: 'image',
            attrs: {
              src: asset.accessUrl,
              alt: asset.originalName,
              title: asset.originalName,
              assetId: asset.assetId,
            },
          })
          .run();
        setStatus('图片已上传并插入编辑器，保存草稿后会建立 DRAFT 引用。');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '图片上传失败。');
    } finally {
      imageActionRef.current = 'insert';
      imageTargetPositionRef.current = undefined;
      setBusy(false);
    }
  };

  const editImageAttribute = async (position: number, attribute: 'alt' | 'caption', promptText: string) => {
    if (!editor) {
      return;
    }
    editor.chain().focus().setNodeSelection(position).run();
    if (!editor.isActive('image')) {
      return;
    }
    const current = editor.getAttributes('image')[attribute] as string | undefined;
    const next = await prompt({
      title: promptText,
      initialValue: current ?? '',
      confirmText: '保存',
    });
    if (next !== undefined) {
      editor.chain().focus().updateAttributes('image', { [attribute]: next.trim() || null }).run();
    }
  };

  const handleAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !editor) {
      return;
    }
    const validationError = validateUploadFile('ATTACHMENT', file);
    if (validationError) {
      setStatus(validationError);
      return;
    }
    setBusy(true);
    try {
      const asset = await uploadDocumentAsset(document.documentId, 'ATTACHMENT', file);
      editor.chain().focus().insertContentAt(
        attachmentTargetPositionRef.current ?? editor.state.selection.from,
        {
          type: 'attachment',
          attrs: {
            assetId: asset.assetId,
            originalName: asset.originalName,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
          },
        },
      ).run();
      setStatus('附件已上传并插入编辑器，自动保存后会建立 DRAFT 引用。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '附件上传失败。');
    } finally {
      attachmentTargetPositionRef.current = undefined;
      setBusy(false);
    }
  };

  const insertMermaid = async (position: number) => {
    if (!editor) {
      return;
    }
    const source = await prompt({
      title: '插入 Mermaid',
      description: '输入 Mermaid 源码，确认后会插入当前文档。',
      initialValue: 'graph TD\n  A[开始] --> B[处理]\n  B --> C[结束]',
      placeholder: 'graph TD\n  A --> B',
      multiline: true,
      confirmText: '插入流程图',
      validate: (value) => {
        if (!value.trim()) return 'Mermaid 源码不能为空。';
        if (value.length > 50 * 1024) return 'Mermaid 源码不能超过 50KB。';
        return undefined;
      },
    });
    if (!source?.trim()) {
      return;
    }
    if (source.length > 50 * 1024) {
      setStatus('Mermaid 源码超过 50KB，请拆分后再插入。');
      return;
    }
    editor.chain().focus().insertContentAt(position, {
      type: 'mermaid',
      attrs: { source: source.trim() },
    }).run();
    setStatus('Mermaid 流程图已插入。发布前请在预览/用户端确认渲染结果。');
  };

  const insertCodeBlock = async (position: number) => {
    if (!editor) {
      return;
    }
    const language = await prompt({
      title: '插入代码块',
      description: '请输入代码语言，用于语法高亮。',
      initialValue: 'java',
      placeholder: 'java、json、bash',
      confirmText: '插入代码块',
    });
    if (language === undefined) {
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection(position)
      .setCodeBlock({ language: language.trim() || 'plaintext' })
      .run();
  };

  return (
    <div className="flex min-h-[520px] flex-col bg-gray-100">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mt-1 text-sm text-gray-500">结构化富文本草稿，自动保存与线上发布相互隔离。</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={[
                'rounded-full px-3 py-1 text-xs font-medium',
                publishState === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700'
                  : publishState === 'PUBLISHED_WITH_CHANGES'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-600',
              ].join(' ')}
            >
              {publishState === 'PUBLISHED'
                ? '已发布'
                : publishState === 'PUBLISHED_WITH_CHANGES'
                  ? '已发布 · 有待发布更新'
                  : '草稿'}
            </span>
            <button
              className="shrink-0 whitespace-nowrap rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={handlePreview}
            >
              用户视角预览
            </button>
            <button
              className="shrink-0 whitespace-nowrap rounded-md bg-brand-500 px-3 py-2 text-sm text-white disabled:opacity-50"
              type="button"
              disabled={busy || !publishAction.enabled}
              onClick={handlePublish}
            >
              {publishAction.label}
            </button>
            <button
              className="shrink-0 whitespace-nowrap rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy || !published}
              onClick={handleUnpublish}
            >
              下架
            </button>
          </div>
        </div>
        {errorMessage ? (
          <div
            aria-live="assertive"
            className="mt-3 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            <div className="min-w-0">
              <span className="font-medium">操作失败：</span>
              <span className="break-words">{errorMessage}</span>
            </div>
            <button
              aria-label="关闭错误提示"
              className="shrink-0 text-red-500 hover:text-red-700"
              type="button"
              onClick={() => setErrorMessage(undefined)}
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
      <div className="mx-4 mt-4 rounded-t-xl border-b border-gray-100 bg-white px-6 py-5 shadow-sm sm:mx-6 lg:mx-8 lg:mt-8">
        <input
          className="w-full border-none text-2xl font-semibold text-gray-950 outline-none"
          placeholder="未命名文档"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markDirty();
          }}
        />
      </div>
      <div className="mx-4 mb-4 flex-1 space-y-4 rounded-b-xl bg-white p-6 shadow-sm sm:mx-6 lg:mx-8 lg:mb-8">
        <BlockContextToolbar
          editor={editor}
          disabled={busy}
          onSetLink={setLink}
          onInsertCodeBlock={insertCodeBlock}
          onInsertImage={(position) => {
            imageActionRef.current = 'insert';
            imageTargetPositionRef.current = position;
            imageInputRef.current?.click();
          }}
          onReplaceImage={(position) => {
            imageActionRef.current = 'replace';
            imageTargetPositionRef.current = position;
            editor?.chain().focus().setNodeSelection(position).run();
            imageInputRef.current?.click();
          }}
          onEditImageAlt={(position) => editImageAttribute(position, 'alt', '请输入图片替代文本')}
          onEditImageCaption={(position) => editImageAttribute(position, 'caption', '请输入图片说明')}
          onInsertAttachment={(position) => {
            attachmentTargetPositionRef.current = position;
            attachmentInputRef.current?.click();
          }}
          onInsertMermaid={insertMermaid}
        />
        <TableContextToolbar
          editor={editor}
          disabled={busy || previewOpen}
          onConfirmDeleteTable={() => confirm({
            title: '删除表格',
            description: '删除后表格及其中内容将从当前草稿移除。',
            confirmText: '删除表格',
            danger: true,
          })}
        />
        <input
          ref={imageInputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelected}
        />
        <input
          ref={attachmentInputRef}
          className="hidden"
          type="file"
          accept=".pdf,.txt,.md,.csv,.docx,.xlsx,.pptx,.zip"
          onChange={handleAttachmentSelected}
        />
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-gray-500">{status}</p>
          <span className="shrink-0 text-xs text-gray-400">{saveStateLabel(saveState)}</span>
        </div>

        {previewOpen ? (
          <div
            aria-label="用户视角预览"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-gray-950/50 p-4 sm:p-6"
            role="dialog"
          >
            <div className="mx-auto flex h-full max-w-[90rem] flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white p-4 sm:px-6">
                <div>
                  <div className="font-semibold text-gray-900">用户视角预览</div>
                  <div className="text-xs text-gray-500">预览当前编辑稿，不会影响线上内容。</div>
                </div>
                <button
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                >
                  关闭预览
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
                <DocumentReader
                  assetScope="admin"
                  containedScroll
                  document={{ documentId: document.documentId, title, content }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {dialog}
    </div>
  );
}

function saveStateLabel(state: SaveState) {
  const labels: Record<SaveState, string> = {
    idle: '尚未编辑',
    dirty: '等待自动保存',
    saving: '保存中...',
    saved: '已保存',
    failed: '自动保存失败',
    conflict: '编辑冲突，自动保存已停止',
  };
  return labels[state];
}
