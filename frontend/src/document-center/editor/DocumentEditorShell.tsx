import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
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
import { CALLOUT_KIND_OPTIONS } from './editorContextActions';
import type { CalloutKind } from '../callout/CalloutExtension';
import { isDocumentApiError } from '@/services/documentApiError';
import { validateUploadFile } from './uploadValidation';

interface DocumentEditorShellProps {
  document?: AdminDocumentDetail;
  onPendingChange?: (pending: boolean) => void;
}

interface DraftSnapshot {
  title: string;
  content: DocumentContent;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed' | 'conflict';

export function DocumentEditorShell({ document, onPendingChange }: DocumentEditorShellProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const imageActionRef = useRef<'insert' | 'replace'>('insert');
  const draftRevisionRef = useRef('0');
  const dirtyRef = useRef(false);
  const hydratingRef = useRef(false);
  const conflictRef = useRef(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<DocumentContent>(emptyDocumentContent);
  const [draftRevision, setDraftRevision] = useState('0');
  const [publishedRevision, setPublishedRevision] = useState<string>();
  const [publicationVersion, setPublicationVersion] = useState<string>();
  const [published, setPublished] = useState(false);
  const [publishState, setPublishState] = useState<DocumentPublishState>('DRAFT');
  const [status, setStatus] = useState('当前为 Tiptap 编辑器基线，可继续扩展图片、附件和 Mermaid 节点。');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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
          setDraftRevision(operation.draftRevision);
        }
        if (operation.publishedRevision) {
          setPublishedRevision(operation.publishedRevision);
        }
        if (operation.publicationVersion) {
          setPublicationVersion(operation.publicationVersion);
        }
        setPublishState((current) => current === 'DRAFT' ? 'DRAFT' : 'PUBLISHED_WITH_CHANGES');
        setSaveState('saved');
        setStatus('草稿已自动保存。');
      } catch (error) {
        const message = error instanceof Error ? error.message : '草稿保存失败。';
        const isConflict = isDocumentApiError(error, 'DOCUMENT_VERSION_CONFLICT');
        conflictRef.current = isConflict;
        setSaveState(isConflict ? 'conflict' : 'failed');
        setStatus(isConflict ? '检测到编辑冲突，已停止自动保存。请复制当前内容并刷新后合并。' : message);
        throw error;
      }
    }),
    [document?.documentId],
  );

  const extensions = useMemo(createDocumentExtensions, []);

  const editor = useEditor({
    extensions,
    content: emptyDocumentContent,
    editorProps: {
      attributes: {
        class:
          'document-editor min-h-[320px] rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm leading-7 text-gray-800 outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setContent(currentEditor.getJSON() as DocumentContent);
      if (!hydratingRef.current) {
        markDirty();
      }
    },
  });

  useEffect(() => {
    if (!document) {
      return;
    }
    const nextContent = document.content ?? emptyDocumentContent;
    hydratingRef.current = true;
    conflictRef.current = false;
    dirtyRef.current = false;
    setTitle(document.title);
    setContent(nextContent);
    setDraftRevision(document.draftRevision);
    draftRevisionRef.current = document.draftRevision;
    setPublishedRevision(document.publishedRevision);
    setPublicationVersion(document.publicationVersion);
    setPublished(document.published);
    setPublishState(document.publishState);
    setDirty(false);
    setSaveState('saved');
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

  if (!document) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        请选择一篇文档
      </div>
    );
  }

  const handleSaveDraft = async () => {
    setBusy(true);
    try {
      dirtyRef.current = false;
      setDirty(false);
      saveCoordinator.enqueue({ title, content });
      await saveCoordinator.flush();
    } catch (error) {
      // Coordinator 已保留失败快照和可见错误状态。
    } finally {
      setBusy(false);
    }
  };

  const publishAction = getPublishActionPresentation(publishState);

  const validateAndFlushDraft = async () => {
    const validation = await validateMermaidSyntax(content);
    if (!validation.valid) {
      setStatus(
        `第 ${(validation.blockIndex ?? 0) + 1} 个 Mermaid 块语法错误：${validation.message ?? '请检查源码。'}`,
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
        setStatus('草稿已保存，正在使用用户端 Reader 预览。');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '打开预览失败。');
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
        setDraftRevision(operation.draftRevision);
      }
      if (operation.publishedRevision) {
        setPublishedRevision(operation.publishedRevision);
      }
      if (operation.publicationVersion) {
        setPublicationVersion(operation.publicationVersion);
      }
      setPublished(true);
      setPublishState('PUBLISHED');
      setStatus(`文档已发布，publicationVersion 已更新为 ${operation.publicationVersion ?? publicationVersion}。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '文档发布失败。');
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
      setPublishedRevision(operation.publishedRevision);
      if (operation.publicationVersion) {
        setPublicationVersion(operation.publicationVersion);
      }
      setPublished(false);
      setPublishState('DRAFT');
      setStatus(
        operation.alreadyUnpublished
          ? '文档已是草稿态，无需重复下架。'
          : `文档已下架，publicationVersion 已更新为 ${operation.publicationVersion ?? publicationVersion}。`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '文档下架失败。');
    } finally {
      setBusy(false);
    }
  };

  const setLink = () => {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('请输入链接地址', previousUrl ?? 'https://');
    if (url === null) {
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
          .setImage({
            src: asset.accessUrl,
            alt: asset.originalName,
            title: asset.originalName,
          })
          .updateAttributes('image', { assetId: asset.assetId })
          .run();
        setStatus('图片已上传并插入编辑器，保存草稿后会建立 DRAFT 引用。');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '图片上传失败。');
    } finally {
      imageActionRef.current = 'insert';
      setBusy(false);
    }
  };

  const editImageAttribute = (attribute: 'alt' | 'caption', promptText: string) => {
    if (!editor?.isActive('image')) {
      return;
    }
    const current = editor.getAttributes('image')[attribute] as string | undefined;
    const next = window.prompt(promptText, current ?? '');
    if (next !== null) {
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
      editor.chain().focus().setAttachment({
        assetId: asset.assetId,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      }).run();
      setStatus('附件已上传并插入编辑器，自动保存后会建立 DRAFT 引用。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '附件上传失败。');
    } finally {
      setBusy(false);
    }
  };

  const insertMermaid = () => {
    if (!editor) {
      return;
    }
    const source = window.prompt(
      '请输入 Mermaid 源码',
      'graph TD\n  A[开始] --> B[处理]\n  B --> C[结束]',
    );
    if (!source?.trim()) {
      return;
    }
    if (source.length > 50 * 1024) {
      setStatus('Mermaid 源码超过 50KB，请拆分后再插入。');
      return;
    }
    editor.chain().focus().setMermaid(source.trim()).run();
    setStatus('Mermaid 流程图已插入。发布前请在预览/用户端确认渲染结果。');
  };

  const insertCodeBlock = () => {
    if (!editor) {
      return;
    }
    const language = window.prompt('请输入代码语言（例如 java、json、bash）', 'java');
    if (language === null) {
      return;
    }
    editor.chain().focus().setCodeBlock({ language: language.trim() || 'plaintext' }).run();
  };

  return (
    <div className="flex min-h-[520px] flex-col rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Admin Draft Workspace</p>
            <p className="mt-1 text-sm text-gray-500">结构化富文本草稿，自动保存与线上发布相互隔离。</p>
          </div>
          <div className="flex items-center gap-3">
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
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={handlePreview}
            >
              用户视角预览
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={handleSaveDraft}
            >
              立即保存
            </button>
            <button
              className="rounded-md bg-brand-500 px-3 py-2 text-sm text-white disabled:opacity-50"
              type="button"
              disabled={busy || !publishAction.enabled}
              onClick={handlePublish}
            >
              {publishAction.label}
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy || !published}
              onClick={handleUnpublish}
            >
              下架
            </button>
          </div>
        </div>
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
      <div className="flex-1 space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton active={editor?.isActive('bold')} disabled={busy} onClick={() => editor?.chain().focus().toggleBold().run()}>
            加粗
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('italic')} disabled={busy} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            斜体
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('underline')} disabled={busy} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            下划线
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('heading', { level: 2 })} disabled={busy} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            二级标题
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('bulletList')} disabled={busy} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            列表
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('orderedList')} disabled={busy} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            编号
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('blockquote')} disabled={busy} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            引用
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive('codeBlock')} disabled={busy} onClick={insertCodeBlock}>
            代码块
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            分割线
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            表格
          </ToolbarButton>
          {editor?.isActive('table') ? (
            <>
              <ToolbarButton disabled={busy} onClick={() => editor.chain().focus().addColumnAfter().run()}>后插入列</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editor.chain().focus().deleteColumn().run()}>删除列</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editor.chain().focus().addRowAfter().run()}>后插入行</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editor.chain().focus().deleteRow().run()}>删除行</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editor.chain().focus().deleteTable().run()}>删除表格</ToolbarButton>
            </>
          ) : null}
          <select
            aria-label="提示块类型"
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40"
            disabled={busy}
            value={(editor?.isActive('callout') ? editor.getAttributes('callout').kind : 'info') as CalloutKind}
            onChange={(event) => {
              const kind = event.target.value as CalloutKind;
              if (editor?.isActive('callout')) {
                editor.chain().focus().updateAttributes('callout', { kind }).run();
              } else {
                editor?.chain().focus().setCallout(kind).run();
              }
            }}
          >
            {CALLOUT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ToolbarButton active={editor?.isActive('link')} disabled={busy} onClick={setLink}>
            链接
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={() => {
            imageActionRef.current = 'insert';
            imageInputRef.current?.click();
          }}>
            图片
          </ToolbarButton>
          {editor?.isActive('image') ? (
            <>
              <ToolbarButton disabled={busy} onClick={() => {
                imageActionRef.current = 'replace';
                imageInputRef.current?.click();
              }}>替换图片</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editImageAttribute('alt', '请输入图片替代文本')}>替代文本</ToolbarButton>
              <ToolbarButton disabled={busy} onClick={() => editImageAttribute('caption', '请输入图片说明')}>图片说明</ToolbarButton>
            </>
          ) : null}
          <ToolbarButton disabled={busy} onClick={() => attachmentInputRef.current?.click()}>
            附件
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={insertMermaid}>
            Mermaid
          </ToolbarButton>
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
        </div>

        <EditorContent editor={editor} />
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-gray-500">{status}</p>
          <span className="shrink-0 text-xs text-gray-400">{saveStateLabel(saveState)}</span>
        </div>

        <details className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
          <summary className="cursor-pointer select-none font-medium text-gray-700">查看当前 Tiptap JSON</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(content, null, 2)}
          </pre>
        </details>
        {previewOpen ? (
          <div className="rounded-2xl border border-brand-100 bg-gray-100 p-5">
            <div className="mb-4 flex items-center justify-between">
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
            <DocumentReader
              assetScope="admin"
              document={{ documentId: document.documentId, title, content }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
        <span>draftRevision: {draftRevision}</span>
        <span>publishedRevision: {publishedRevision ?? '-'}</span>
        <span>publicationVersion: {publicationVersion ?? '0'}</span>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  children: string;
  onClick: () => void;
}

function ToolbarButton({ active, disabled, children, onClick }: ToolbarButtonProps) {
  return (
    <button
      className={[
        'rounded-md border px-3 py-1.5 text-sm disabled:opacity-40',
        active ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700',
      ].join(' ')}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function saveStateLabel(state: SaveState) {
  const labels: Record<SaveState, string> = {
    idle: '尚未编辑',
    dirty: '等待自动保存',
    saving: '保存中...',
    saved: '已保存',
    failed: '保存失败，可点击立即保存重试',
    conflict: '编辑冲突，自动保存已停止',
  };
  return labels[state];
}
