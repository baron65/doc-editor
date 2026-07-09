import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { MermaidExtension } from '@/document-center/mermaid/MermaidExtension';
import { DOCUMENT_SCHEMA_VERSION, emptyDocumentContent } from '@/document-center/schema/documentSchema';
import {
  publishDocument,
  saveDraft,
  unpublishDocument,
  uploadDocumentAsset,
} from '@/services/documentCenter';
import type { AdminDocumentDetail, DocumentContent } from '@/types/documentCenter';

interface DocumentEditorShellProps {
  document?: AdminDocumentDetail;
}

export function DocumentEditorShell({ document }: DocumentEditorShellProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<DocumentContent>(emptyDocumentContent);
  const [draftRevision, setDraftRevision] = useState('0');
  const [publishedRevision, setPublishedRevision] = useState<string>();
  const [publicationVersion, setPublicationVersion] = useState<string>();
  const [published, setPublished] = useState(false);
  const [status, setStatus] = useState('当前为 Tiptap 编辑器基线，可继续扩展图片、附件和 Mermaid 节点。');
  const [busy, setBusy] = useState(false);

  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            assetId: {
              default: null,
            },
            caption: {
              default: null,
            },
          };
        },
      }),
      MermaidExtension,
    ],
    [],
  );

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
    },
  });

  useEffect(() => {
    if (!document) {
      return;
    }
    const nextContent = document.content ?? emptyDocumentContent;
    setTitle(document.title);
    setContent(nextContent);
    setDraftRevision(document.draftRevision);
    setPublishedRevision(document.publishedRevision);
    setPublicationVersion(document.publicationVersion);
    setPublished(document.published);
    setStatus(document.published ? '线上稿已发布，可继续编辑草稿。' : '当前为草稿态。');
    editor?.commands.setContent(nextContent);
  }, [document, editor]);

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
      const operation = await saveDraft(document.documentId, {
        title,
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        content,
        expectedDraftRevision: draftRevision,
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
      setStatus(`草稿已保存，draftRevision 已更新为 ${operation.draftRevision ?? draftRevision}。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '草稿保存失败。');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      const operation = await publishDocument(document.documentId, {
        expectedDraftRevision: draftRevision,
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
    setBusy(true);
    try {
      const asset = await uploadDocumentAsset(document.documentId, 'IMAGE', file);
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
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '图片上传失败。');
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

  return (
    <div className="flex min-h-[520px] flex-col rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Admin Draft Workspace</p>
            <p className="mt-1 text-sm text-gray-500">Tiptap JSON 编辑基线，后续扩展图片、附件、Mermaid。</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                'rounded-full px-3 py-1 text-xs font-medium',
                published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
              ].join(' ')}
            >
              {published ? '已发布' : '草稿'}
            </span>
            <button
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={handleSaveDraft}
            >
              保存草稿
            </button>
            <button
              className="rounded-md bg-brand-500 px-3 py-2 text-sm text-white disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={handlePublish}
            >
              发布
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
          onChange={(event) => setTitle(event.target.value)}
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
          <ToolbarButton active={editor?.isActive('link')} disabled={busy} onClick={setLink}>
            链接
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={() => imageInputRef.current?.click()}>
            图片
          </ToolbarButton>
          <ToolbarButton disabled={busy} onClick={insertMermaid}>
            Mermaid
          </ToolbarButton>
          <input
            ref={imageInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleImageSelected}
          />
        </div>

        <EditorContent editor={editor} />
        <p className="text-sm text-gray-500">{status}</p>

        <details className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
          <summary className="cursor-pointer select-none font-medium text-gray-700">查看当前 Tiptap JSON</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(content, null, 2)}
          </pre>
        </details>
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
