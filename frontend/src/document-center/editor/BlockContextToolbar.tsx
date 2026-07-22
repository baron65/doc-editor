import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/core';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';
import { EditorContent } from '@tiptap/react';
import {
  getBlockHandlePresentation,
  getBlockMenuSide,
  getDocumentBlockTextRange,
  resolveDocumentBlockTarget,
  resolveFormattableTextBlockTarget,
  type DocumentBlockTarget,
} from './blockContextModel';
import {
  BLOCK_SHORTCUTS,
  formatBlockShortcut,
  matchesBlockShortcut,
  type BlockShortcutName,
} from './blockShortcutModel';
import type { CalloutKind } from '../callout/CalloutExtension';
import { blockHighlightPluginKey } from './BlockHighlightExtension';
import {
  SAFE_FONT_SIZES,
  SAFE_TEXT_BACKGROUND_COLORS,
  SAFE_TEXT_COLORS,
  normalizeBlockIndent,
  type BlockTextAlign,
} from '../content/blockFormatting';
import { TableSizePicker } from './TableSizePicker';
import { InlineToolIcon } from './InlineToolIcon';

interface BlockContextToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onSetLink: () => void;
  onInsertCodeBlock: (position: number) => void;
  onInsertImage: (position: number) => void;
  onReplaceImage: (position: number) => void;
  onEditImageAlt: (position: number) => void;
  onEditImageCaption: (position: number) => void;
  onInsertAttachment: (position: number) => void;
  onInsertMermaid: (position: number) => void;
  getAttachmentDownloadUrl?: (assetId: string) => string;
}

interface BlockTarget {
  top: number;
  pos: number;
  end: number;
  insertionPos: number;
  selectionPos: number;
  viewportTop: number;
  type: string;
  empty: boolean;
  attrs: Record<string, unknown>;
  node: ProseMirrorNode;
  handleViewportLeft: number;
  left: number;
  width: number;
}

type CascadeMenuView = 'alignment' | 'color' | 'fontSize';
type SelectionFormatMenuView = 'color' | 'backgroundColor';

interface CascadeMenuState {
  view: CascadeMenuView;
  top: number;
  left: number;
}

interface TablePickerState {
  top: number;
  left: number;
  selectionPos: number;
}

interface SelectionFormatMenuState {
  view: SelectionFormatMenuView;
  top: number;
  left: number;
}

const TEXT_FORMATTING_EXCLUDED_NODE_TYPES = new Set([
  'attachment',
  'codeBlock',
  'horizontalRule',
  'image',
  'mermaid',
]);

export function BlockContextToolbar({
  editor,
  disabled,
  onSetLink,
  onInsertCodeBlock,
  onInsertImage,
  onReplaceImage,
  onEditImageAlt,
  onEditImageCaption,
  onInsertAttachment,
  onInsertMermaid,
  getAttachmentDownloadUrl,
}: BlockContextToolbarProps) {
  const [target, setTarget] = useState<BlockTarget>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cascadeMenu, setCascadeMenu] = useState<CascadeMenuState>();
  const [selectionMenu, setSelectionMenu] = useState<{ top: number; left: number }>();
  const [selectionFormatMenu, setSelectionFormatMenu] = useState<SelectionFormatMenuState>();
  const [tablePicker, setTablePicker] = useState<TablePickerState>();
  const closeMenuTimerRef = useRef<number>();
  const isMac = isMacPlatform();

  useEffect(() => {
    if (!editor) {
      return undefined;
    }
    const updateSelectionMenu = () => {
      const selection = editor.state.selection;
      const { from, to } = selection;
      if (!isTextFormattingSelection(editor) || disabled) {
        setSelectionMenu(undefined);
        setSelectionFormatMenu(undefined);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setSelectionMenu({
        top: Math.max(8, Math.min(start.top, end.top) - 46),
        left: Math.max(8, Math.min(window.innerWidth - 250, (start.left + end.right) / 2 - 120)),
      });
    };
    const hideSelectionMenu = () => {
      setSelectionMenu(undefined);
      setSelectionFormatMenu(undefined);
    };
    editor.on('selectionUpdate', updateSelectionMenu);
    editor.on('blur', hideSelectionMenu);
    return () => {
      editor.off('selectionUpdate', updateSelectionMenu);
      editor.off('blur', hideSelectionMenu);
    };
  }, [disabled, editor]);

  useEffect(() => () => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current);
    }
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta(blockHighlightPluginKey, null));
    }
  }, [editor]);

  useEffect(() => {
    if (!tablePicker) return undefined;
    const closeOutside = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : undefined;
      if (!element?.closest('.table-size-picker')) setTablePicker(undefined);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [tablePicker]);

  useEffect(() => {
    if (!editor) {
      return undefined;
    }
    const handleShortcut = (event: KeyboardEvent) => {
      if (disabled || event.isComposing || !editor.view.hasFocus()) {
        return;
      }
      const shortcut = (Object.keys(BLOCK_SHORTCUTS) as BlockShortcutName[]).find((name) => (
        matchesBlockShortcut(event, BLOCK_SHORTCUTS[name], isMac)
      ));
      if (!shortcut) {
        return;
      }
      const block = resolveDocumentBlockTarget(editor.state.doc, editor.state.selection.from);
      if (!block || !runShortcutAction(shortcut, block, {
        editor,
        onSetLink,
        onInsertCodeBlock,
        onInsertImage,
        onReplaceImage,
        onEditImageAlt,
        onEditImageCaption,
        onInsertAttachment,
        onInsertMermaid,
        onInsertTable: (position) => {
          const coords = editor.view.coordsAtPos(position);
          setTablePicker({
            top: Math.max(16, Math.min(coords.top, window.innerHeight - 520)),
            left: Math.max(16, Math.min(coords.left, window.innerWidth - 368)),
            selectionPos: position,
          });
        },
      })) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleShortcut, true);
    return () => editorElement.removeEventListener('keydown', handleShortcut, true);
  }, [
    disabled,
    editor,
    isMac,
    onEditImageAlt,
    onEditImageCaption,
    onInsertAttachment,
    onInsertCodeBlock,
    onInsertImage,
    onInsertMermaid,
    onReplaceImage,
    onSetLink,
  ]);

  if (!editor) {
    return null;
  }

  const clearTargetHighlight = () => {
    editor.view.dispatch(editor.state.tr.setMeta(blockHighlightPluginKey, null));
  };

  const cancelScheduledClose = () => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = undefined;
    }
  };

  const scheduleMenuClose = () => {
    cancelScheduledClose();
    closeMenuTimerRef.current = window.setTimeout(() => {
      clearTargetHighlight();
      setMenuOpen(false);
      setCascadeMenu(undefined);
      closeMenuTimerRef.current = undefined;
    }, 120);
  };

  const highlightTarget = () => {
    if (!target) {
      return;
    }
    editor.view.dispatch(editor.state.tr.setMeta(blockHighlightPluginKey, {
      from: target.pos,
      to: target.end,
    }));
  };

  const focusTarget = () => {
    const position = Math.min(target ? target.selectionPos : editor.state.selection.from, editor.state.doc.content.size);
    return editor.chain().focus().setTextSelection(position);
  };

  const insertionPosition = () => {
    if (!target) {
      return editor.state.selection.from;
    }
    return target.insertionPos;
  };

  const insertAfterTarget = (content: Record<string, unknown>) => {
    editor.chain().focus().insertContentAt(insertionPosition(), content).run();
  };

  const run = (action: () => void) => {
    action();
    cancelScheduledClose();
    setMenuOpen(false);
    setCascadeMenu(undefined);
    clearTargetHighlight();
  };

  const openMenu = () => {
    if (!target || disabled) {
      return;
    }
    cancelScheduledClose();
    highlightTarget();
    if (!menuOpen) setCascadeMenu(undefined);
    setMenuOpen(true);
  };

  const activateBlockHandle = () => {
    if (target?.type === 'table') {
      editor.chain().focus().setNodeSelection(target.pos).run();
    }
    openMenu();
  };

  const openCascadeMenu = (
    view: CascadeMenuView,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    cancelScheduledClose();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 208;
    const estimatedHeight = view === 'alignment' ? 312 : 280;
    setCascadeMenu({
      view,
      top: Math.max(8, Math.min(rect.top, window.innerHeight - estimatedHeight - 8)),
      left: Math.max(8, Math.min(rect.right + 6, window.innerWidth - width - 8)),
    });
  };

  const openTablePicker = () => {
    if (!target) return;
    const width = 352;
    setTablePicker({
      top: Math.max(16, Math.min(target.viewportTop, window.innerHeight - 520)),
      left: Math.max(16, Math.min(target.handleViewportLeft + 44, window.innerWidth - width - 16)),
      selectionPos: target.selectionPos,
    });
    setMenuOpen(false);
    setCascadeMenu(undefined);
    clearTargetHighlight();
  };

  const insertSelectedTable = (rows: number, columns: number) => {
    if (!tablePicker) return;
    editor.chain()
      .focus()
      .setTextSelection(tablePicker.selectionPos)
      .insertTable({ rows, cols: columns, withHeaderRow: true })
      .run();
    setTablePicker(undefined);
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    if ((event.target as HTMLElement).closest('[data-block-handle="true"]')) {
      cancelScheduledClose();
      highlightTarget();
      if (target?.type !== 'attachment') {
        setMenuOpen(true);
      }
      return;
    }
    if (menuOpen) {
      scheduleMenuClose();
      return;
    }
    const position = editor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });
    if (!position) {
      // Keep the last block active while the pointer crosses the editor gutter toward the handle.
      return;
    }
    const blockTarget = resolveDocumentBlockTarget(editor.state.doc, position.pos);
    if (!blockTarget) {
      return;
    }
    const block = editor.view.nodeDOM(blockTarget.pos);
    if (!(block instanceof HTMLElement)) {
      return;
    }
    const wrapperRect = event.currentTarget.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const { node } = blockTarget;
    const nextTarget = {
      top: blockRect.top - wrapperRect.top,
      viewportTop: blockRect.top,
      pos: blockTarget.pos,
      end: blockTarget.end,
      insertionPos: blockTarget.insertionPos,
      selectionPos: blockTarget.selectionPos,
      type: blockTarget.presentationType,
      empty: node.textContent.length === 0,
      attrs: node.attrs,
      node,
      handleViewportLeft: wrapperRect.left + 8,
      left: blockRect.left - wrapperRect.left,
      width: blockRect.width,
    };
    setTarget((current) => (
      current?.pos === nextTarget.pos && current.top === nextTarget.top
        ? current
        : nextTarget
    ));
  };

  const presentation = target
    ? getBlockHandlePresentation(target.type, target.empty, target.attrs)
    : undefined;
  const menuOffsetTop = target
    ? Math.max(16, Math.min(target.viewportTop, window.innerHeight - Math.min(640, window.innerHeight - 32) - 16))
      - target.viewportTop
    : 0;
  const shortcutLabel = (name: BlockShortcutName) => formatBlockShortcut(BLOCK_SHORTCUTS[name], isMac);
  const menuSide = target ? getBlockMenuSide(target.handleViewportLeft, window.innerWidth) : 'right';

  const targetDocumentBlock = (): DocumentBlockTarget | undefined => target ? ({
    pos: target.pos,
    end: target.end,
    insertionPos: target.insertionPos,
    selectionPos: target.selectionPos,
    presentationType: target.type,
    node: target.node,
  }) : undefined;

  const updateTargetTextBlockAttributes = (attrs: Record<string, unknown>) => {
    const textBlock = resolveFormattableTextBlockTarget(targetDocumentBlock());
    if (!textBlock) return false;
    const tr = editor.state.tr.setNodeMarkup(textBlock.pos, undefined, {
      ...textBlock.node.attrs,
      ...attrs,
    }, textBlock.node.marks);
    editor.view.dispatch(tr);
    return true;
  };

  const setTargetAlignment = (textAlign: BlockTextAlign) => {
    if (!target) return;
    run(() => {
      updateTargetTextBlockAttributes({ textAlign });
    });
  };

  const changeTargetIndent = (delta: number) => {
    if (!target) return;
    if (['bulletList', 'orderedList', 'taskList'].includes(target.type)) {
      const itemType = target.type === 'taskList' ? 'taskItem' : 'listItem';
      run(() => delta > 0 ? focusTarget().sinkListItem(itemType).run() : focusTarget().liftListItem(itemType).run());
      return;
    }
    const textBlock = resolveFormattableTextBlockTarget(targetDocumentBlock());
    if (!textBlock) return;
    const indent = normalizeBlockIndent(Number(textBlock.node.attrs.indent ?? 0) + delta);
    run(() => {
      updateTargetTextBlockAttributes({ indent });
    });
  };

  const applyTargetColor = (color: string | null) => {
    const range = getDocumentBlockTextRange(targetDocumentBlock());
    if (!range || range.from === range.to) return;
    run(() => {
      updateTextStyleMark(editor, range, { color });
    });
  };

  const applyTargetFontSize = (fontSize: string) => {
    if (!allowsFontSizeFormatting(targetDocumentBlock())) return;
    const range = getDocumentBlockTextRange(targetDocumentBlock());
    if (!range || range.from === range.to) return;
    run(() => {
      updateTextStyleMark(editor, range, { fontSize });
    });
  };

  const applySelectionTextStyle = (patch: { color?: string | null; backgroundColor?: string | null }) => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    updateTextStyleMark(editor, { from, to }, patch);
    setSelectionFormatMenu(undefined);
  };

  const openSelectionFormatMenu = (
    view: SelectionFormatMenuView,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 184;
    setSelectionFormatMenu({
      view,
      top: Math.min(window.innerHeight - 56, rect.bottom + 6),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    });
  };

  const copyTargetNode = () => {
    if (!target) return;
    run(() => {
      void copyNodeAsRichContent(target.node, editor.schema);
    });
  };

  const deleteTargetNode = () => {
    if (!target) return;
    cancelScheduledClose();
    const transaction = editor.state.tr.delete(target.pos, target.end);
    const cursorPosition = Math.min(target.pos, transaction.doc.content.size);
    transaction.setSelection(Selection.near(transaction.doc.resolve(cursorPosition), 1));
    transaction.setMeta(blockHighlightPluginKey, null);
    editor.view.dispatch(transaction.scrollIntoView());
    editor.view.focus();
    setTarget(undefined);
    setMenuOpen(false);
    setCascadeMenu(undefined);
  };

  return (
    <div
      className="relative"
      data-block-context-editor="true"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (!menuOpen) {
          setTarget(undefined);
        }
      }}
    >
      <EditorContent editor={editor} />
      {target?.type === 'attachment' ? (
        <div
          data-attachment-toolbar="true"
          data-block-handle="true"
          className="absolute z-40 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
          style={{
            top: Math.max(0, target.top - 34),
            left: Math.max(0, target.left + target.width - 78),
          }}
          role="toolbar"
          aria-label="附件操作"
          onPointerEnter={() => {
            cancelScheduledClose();
            highlightTarget();
          }}
          onMouseLeave={scheduleMenuClose}
        >
          <a
            aria-label="下载附件"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 no-underline hover:bg-gray-100 hover:text-brand-600"
            download
            href={getAttachmentDownloadUrl?.(String(target.attrs.assetId ?? '')) || '#'}
            title="下载附件"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => event.stopPropagation()}
          >
            <AttachmentToolbarIcon type="download" />
          </a>
          <button
            aria-label="删除附件"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="删除附件"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={deleteTargetNode}
          >
            <AttachmentToolbarIcon type="delete" />
          </button>
        </div>
      ) : null}
      {target
        && presentation
        && target.type !== 'attachment'
        && target.type !== 'table'
        && target.type !== 'mermaid'
        && target.type !== 'codeBlock'
        && target.type !== 'image' ? (
        <div
          data-block-handle="true"
          className="absolute left-2 z-30"
          style={{ top: target.top }}
          onPointerEnter={() => {
            cancelScheduledClose();
            highlightTarget();
            openMenu();
          }}
          onMouseLeave={scheduleMenuClose}
        >
          <button
            aria-label={presentation.label}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 text-xs font-medium text-gray-500 shadow-sm hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            type="button"
            onClick={activateBlockHandle}
            onPointerEnter={() => {
              cancelScheduledClose();
              highlightTarget();
              openMenu();
            }}
          >
            <BlockHandleIcon
              empty={target.empty}
              fallback={presentation.icon}
              type={target.type}
            />
          </button>
          {menuOpen ? (
            <div
              className={`absolute ${menuSide === 'left' ? 'right-9' : 'left-9'} w-56 max-h-[min(40rem,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl`}
              style={{ top: menuOffsetTop }}
              role="menu"
              aria-label="块工具箱"
              onMouseEnter={cancelScheduledClose}
              onMouseOver={(event) => {
                const menuItem = event.target instanceof Element
                  ? event.target.closest<HTMLButtonElement>('button[role="menuitem"]')
                  : null;
                if (menuItem && menuItem.dataset.hasSubmenu !== 'true') {
                  setCascadeMenu(undefined);
                }
              }}
            >
              <MenuGroup compact label="转换为">
                <MenuButton
                  compact
                  active={target.type === 'paragraph'}
                  icon="T"
                  label="正文"
                  shortcut={shortcutLabel('paragraph')}
                  onRun={() => run(() => focusTarget().setParagraph().run())}
                />
                {([1, 2, 3] as const).map((level) => (
                  <MenuButton
                    key={level}
                    compact
                    active={target.type === 'heading' && Number(target.attrs.level) === level}
                    icon={`H${level}`}
                    label={`H${level}`}
                    shortcut={shortcutLabel(`heading${level}` as BlockShortcutName)}
                    onRun={() => run(() => focusTarget().toggleHeading({ level }).run())}
                  />
                ))}
                <MenuButton compact active={target.type === 'orderedList'} icon={<BlockToolIcon type="ordered-list" />} label="编号" shortcut={shortcutLabel('orderedList')} onRun={() => run(() => focusTarget().toggleOrderedList().run())} />
                <MenuButton compact active={target.type === 'bulletList'} icon={<BlockToolIcon type="bullet-list" />} label="列表" shortcut={shortcutLabel('bulletList')} onRun={() => run(() => focusTarget().toggleBulletList().run())} />
                <MenuButton compact active={target.type === 'codeBlock'} icon={<BlockToolIcon type="code" />} label="代码块" shortcut={shortcutLabel('codeBlock')} onRun={() => run(() => onInsertCodeBlock(target.selectionPos))} />
                <MenuButton compact active={target.type === 'blockquote'} icon={<BlockToolIcon type="quote" />} label="引用" shortcut={shortcutLabel('blockquote')} onRun={() => run(() => focusTarget().toggleBlockquote().run())} />
                <MenuButton compact icon={<BlockToolIcon type="copy" />} label="复制节点" shortcut={shortcutLabel('duplicateNode')} onRun={copyTargetNode} />
                <MenuButton compact icon={<BlockToolIcon type="delete" />} label="删除节点" shortcut={shortcutLabel('deleteNode')} danger onRun={deleteTargetNode} />
              </MenuGroup>
              <MenuGroup label="格式">
                <MenuButton hasSubmenu icon={<BlockToolIcon type="align-left" />} label="缩进和对齐" shortcut={shortcutLabel('alignLeft')} onHover={(event) => openCascadeMenu('alignment', event)} onRun={() => undefined} />
                <MenuButton hasSubmenu icon={<BlockToolIcon type="color" />} label="文字颜色" shortcut={shortcutLabel('colorDefault')} onHover={(event) => openCascadeMenu('color', event)} onRun={() => undefined} />
                {target.type !== 'heading' && allowsFontSizeFormatting(targetDocumentBlock()) ? (
                  <MenuButton hasSubmenu icon={<BlockToolIcon type="font-size" />} label="字号" shortcut={shortcutLabel('fontSizeBody')} onHover={(event) => openCascadeMenu('fontSize', event)} onRun={() => undefined} />
                ) : null}
              </MenuGroup>
              <MenuGroup label="插入">
                <MenuButton label="分割线" shortcut={shortcutLabel('horizontalRule')} onRun={() => run(() => insertAfterTarget({ type: 'horizontalRule' }))} />
                <MenuButton
                  label="表格"
                  shortcut={shortcutLabel('table')}
                  onRun={openTablePicker}
                />
                <MenuButton label="图片" shortcut={shortcutLabel('image')} onRun={() => run(() => onInsertImage(insertionPosition()))} />
                <MenuButton label="附件" shortcut={shortcutLabel('attachment')} onRun={() => run(() => onInsertAttachment(insertionPosition()))} />
                <MenuButton label="Mermaid" shortcut={shortcutLabel('mermaid')} onRun={() => run(() => onInsertMermaid(insertionPosition()))} />
              </MenuGroup>
              <MenuGroup label="提示块">
                {(['info', 'warning', 'success', 'danger'] as CalloutKind[]).map((kind) => (
                  <MenuButton
                    key={kind}
                    active={target.type === 'callout' && target.attrs.kind === kind}
                    label={calloutLabel(kind)}
                    shortcut={shortcutLabel(calloutShortcutName(kind))}
                    onRun={() => run(() => {
                      if (target.type === 'callout') {
                        focusTarget().updateAttributes('callout', { kind }).run();
                      } else {
                        insertAfterTarget({
                          type: 'callout',
                          attrs: { kind },
                          content: [{ type: 'paragraph' }],
                        });
                      }
                    })}
                  />
                ))}
              </MenuGroup>
              {target.type === 'image' ? (
                <MenuGroup label="图片操作">
                  <MenuButton label="替换" shortcut={shortcutLabel('replaceImage')} onRun={() => run(() => onReplaceImage(target.pos))} />
                  <MenuButton label="替代文本" shortcut={shortcutLabel('imageAlt')} onRun={() => run(() => onEditImageAlt(target.pos))} />
                  <MenuButton label="图片说明" shortcut={shortcutLabel('imageCaption')} onRun={() => run(() => onEditImageCaption(target.pos))} />
                </MenuGroup>
              ) : null}
            </div>
          ) : null}
          {menuOpen && cascadeMenu ? (
            <div
              className="z-50 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
              style={{ position: 'fixed', top: cascadeMenu.top, left: cascadeMenu.left }}
              role="menu"
              aria-label={cascadeMenuTitle(cascadeMenu.view)}
              onMouseEnter={cancelScheduledClose}
              onMouseLeave={scheduleMenuClose}
            >
              {cascadeMenu.view === 'alignment' ? (
                <MenuGroup label="对齐方式">
                  {(['left', 'center', 'right', 'justify'] as BlockTextAlign[]).map((align) => (
                    <MenuButton key={align} icon={<BlockToolIcon type={`align-${align}`} />} label={alignmentLabel(align)} shortcut={shortcutLabel(alignmentShortcutName(align))} onRun={() => setTargetAlignment(align)} />
                  ))}
                  <MenuButton icon={<BlockToolIcon type="indent-decrease" />} label="减少缩进" shortcut={shortcutLabel('indentDecrease')} onRun={() => changeTargetIndent(-1)} />
                  <MenuButton icon={<BlockToolIcon type="indent-increase" />} label="增加缩进" shortcut={shortcutLabel('indentIncrease')} onRun={() => changeTargetIndent(1)} />
                </MenuGroup>
              ) : null}
              {cascadeMenu.view === 'color' ? (
                <MenuGroup label="安全色板">
                  {SAFE_TEXT_COLORS.map((color) => (
                    <MenuButton key={color.value ?? 'default'} icon={<ColorSwatch color={color.value} />} label={color.label} shortcut={shortcutLabel(colorShortcutName(color.value))} onRun={() => applyTargetColor(color.value)} />
                  ))}
                </MenuGroup>
              ) : null}
              {cascadeMenu.view === 'fontSize' ? (
                <MenuGroup label="字号">
                  {SAFE_FONT_SIZES.map((fontSize) => (
                    <MenuButton key={fontSize.value} label={fontSize.label} shortcut={shortcutLabel(fontSizeShortcutName(fontSize.value))} onRun={() => applyTargetFontSize(fontSize.value)} />
                  ))}
                </MenuGroup>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {selectionMenu ? (
        <div
          className="fixed z-40 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
          style={selectionMenu}
          aria-label="文字格式工具栏"
        >
          <InlineButton active={editor.isActive('code')} icon={<InlineToolIcon type="code" />} label="行内代码" shortcut={shortcutLabel('codeBlock')} onRun={() => editor.chain().focus().toggleCode().run()} />
          <span className="mx-0.5 h-5 w-px bg-gray-200" aria-hidden="true" />
          <InlineButton active={editor.isActive('bold')} icon={<InlineToolIcon type="bold" />} label="加粗" shortcut={shortcutLabel('bold')} onRun={() => editor.chain().focus().toggleBold().run()} />
          <InlineButton active={editor.isActive('italic')} icon={<InlineToolIcon type="italic" />} label="斜体" shortcut={shortcutLabel('italic')} onRun={() => editor.chain().focus().toggleItalic().run()} />
          <InlineButton active={editor.isActive('strike')} icon={<InlineToolIcon type="strike" />} label="删除线" shortcut={shortcutLabel('strike')} onRun={() => editor.chain().focus().toggleStrike().run()} />
          <InlineButton active={editor.isActive('underline')} icon={<InlineToolIcon type="underline" />} label="下划线" shortcut={shortcutLabel('underline')} onRun={() => editor.chain().focus().toggleUnderline().run()} />
          <InlineButton active={editor.isActive('link')} icon={<InlineToolIcon type="link" />} label="链接" shortcut={shortcutLabel('link')} onRun={onSetLink} />
          <InlineButton icon={<InlineToolIcon type="text-color" />} label="文字颜色" shortcut={shortcutLabel('colorDefault')} onRun={openSelectionFormatMenu.bind(null, 'color')} />
          <InlineButton icon={<InlineToolIcon type="background-color" />} label="背景颜色" shortcut={shortcutLabel('backgroundColorDefault')} onRun={openSelectionFormatMenu.bind(null, 'backgroundColor')} />
        </div>
      ) : null}
      {selectionFormatMenu ? (
        <InlineColorPalette
          colors={selectionFormatMenu.view === 'color' ? SAFE_TEXT_COLORS : SAFE_TEXT_BACKGROUND_COLORS}
          label={selectionFormatMenu.view === 'color' ? '文字颜色' : '背景颜色'}
          position={selectionFormatMenu}
          onSelect={(color) => applySelectionTextStyle(
            selectionFormatMenu.view === 'color' ? { color } : { backgroundColor: color },
          )}
        />
      ) : null}
      {tablePicker ? (
        <TableSizePicker
          position={{ top: tablePicker.top, left: tablePicker.left }}
          onCancel={() => setTablePicker(undefined)}
          onInsert={insertSelectedTable}
        />
      ) : null}
    </div>
  );
}

function AttachmentToolbarIcon({ type }: { type: 'download' | 'delete' }) {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {type === 'download' ? (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 20h14" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="m7 7 1 13h8l1-13" />
          <path d="M10 11v5M14 11v5" />
        </>
      )}
    </svg>
  );
}

function MenuGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 py-1.5 first:pt-0 last:border-b-0 last:pb-0">
      <div className={compact ? 'sr-only' : 'mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400'}>{label}</div>
      <div className={compact ? 'grid grid-cols-5 gap-0.5' : 'flex flex-col'}>{children}</div>
    </div>
  );
}

function MenuButton({
  label,
  icon,
  shortcut,
  compact,
  active,
  danger,
  hasSubmenu,
  onHover,
  onRun,
}: {
  label: string;
  icon?: ReactNode;
  shortcut: string;
  compact?: boolean;
  active?: boolean;
  danger?: boolean;
  hasSubmenu?: boolean;
  onHover?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRun: () => void;
}) {
  return (
    <button
      aria-label={`${label}，快捷键 ${shortcut}`}
      title={`${label} · ${shortcut}`}
      className={`${compact ? 'group relative flex h-10 items-center justify-center rounded-lg px-1 text-base' : 'flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-5'} ${
        danger
          ? 'text-red-700 hover:bg-red-50'
          : active
            ? 'bg-brand-50 font-medium text-brand-700'
            : 'text-gray-700 hover:bg-gray-50'
      }`}
      type="button"
      role="menuitem"
      data-has-submenu={hasSubmenu ? 'true' : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onMouseOver={onHover}
      onClick={(event) => onHover ? onHover(event) : onRun()}
    >
      {compact ? (
        <>
          <span aria-hidden="true">{icon ?? label}</span>
          <span className="sr-only">{label}，{shortcut}</span>
          <span
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden w-max max-w-48 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-center text-[11px] font-normal leading-4 text-white shadow-lg group-focus-visible:block group-hover:block"
            role="tooltip"
          >
            {label} · {shortcut}
          </span>
        </>
      ) : (
        <>
          <span className="flex min-w-0 items-center gap-2">{icon ? <span className="shrink-0 text-gray-500">{icon}</span> : null}<span>{label}</span></span>
          <span className="flex shrink-0 items-center gap-2">
            <kbd className="font-sans text-[11px] font-normal text-gray-400">{shortcut}</kbd>
            {hasSubmenu ? <span aria-hidden="true" className="text-base text-gray-400">›</span> : null}
          </span>
        </>
      )}
    </button>
  );
}

function BlockToolIcon({ type }: { type: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const lines = <><path d="M9 6h11M9 12h11M9 18h11" /></>;
  return (
    <svg {...common} aria-hidden="true">
      {type === 'bullet-list' ? <><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />{lines}</> : null}
      {type === 'ordered-list' ? <><path d="M3 5h2v3M3 11h2l-2 3h2M3 17h2l-2 2h2" />{lines}</> : null}
      {type === 'task-list' ? <><rect x="3" y="4" width="5" height="5" rx="1" /><path d="m4.4 6.5 1.2 1.2 2-2M11 6.5h9M11 12h9M11 17.5h9" /></> : null}
      {type === 'quote' ? <path d="M7 7H4v5h4v-2H6c0-1.5.4-2.4 1-3M17 7h-3v5h4v-2h-2c0-1.5.4-2.4 1-3" strokeWidth="2.2" /> : null}
      {type === 'code' ? <path d="m8 5-4 7 4 7M16 5l4 7-4 7M14 3l-4 18" /> : null}
      {type.startsWith('align-') ? alignmentIcon(type.slice(6)) : null}
      {type === 'indent-increase' ? <>{lines}<path d="m3 9 3 3-3 3" /></> : null}
      {type === 'indent-decrease' ? <>{lines}<path d="m6 9-3 3 3 3" /></> : null}
      {type === 'color' ? <><path d="m5 19 7-14 7 14M8 14h8" /><path d="M4 22h16" stroke="#2563eb" strokeWidth="3" /></> : null}
      {type === 'font-size' ? <><path d="M4 6h10M9 6v12M6 18h6M15 11h5M17.5 11v7M16 18h3" /></> : null}
      {type === 'copy' ? <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></> : null}
      {type === 'delete' ? <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></> : null}
    </svg>
  );
}

function BlockHandleIcon({
  empty,
  fallback,
  type,
}: {
  empty: boolean;
  fallback: string;
  type: string;
}) {
  if (empty) return <>{fallback}</>;

  const toolbarIconType = ({
    bulletList: 'bullet-list',
    orderedList: 'ordered-list',
    taskList: 'task-list',
    blockquote: 'quote',
    codeBlock: 'code',
  } as Record<string, string>)[type];

  return toolbarIconType
    ? <BlockToolIcon type={toolbarIconType} />
    : <>{fallback}</>;
}

function alignmentIcon(align: string) {
  if (align === 'center') return <path d="M5 6h14M8 10h8M5 14h14M8 18h8" />;
  if (align === 'right') return <path d="M5 6h14M9 10h10M5 14h14M9 18h10" />;
  if (align === 'justify') return <path d="M5 6h14M5 10h14M5 14h14M5 18h14" />;
  return <path d="M5 6h14M5 10h10M5 14h14M5 18h10" />;
}

function ColorSwatch({ color }: { color: string | null }) {
  return <span className="block h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: color ?? '#ffffff' }} />;
}

function alignmentLabel(align: BlockTextAlign) {
  return { left: '左对齐', center: '居中对齐', right: '右对齐', justify: '两端对齐' }[align];
}

function alignmentShortcutName(align: BlockTextAlign): BlockShortcutName {
  return { left: 'alignLeft', center: 'alignCenter', right: 'alignRight', justify: 'alignJustify' }[align] as BlockShortcutName;
}

function colorShortcutName(color: string | null): BlockShortcutName {
  return ({
    default: 'colorDefault',
    '#4b5563': 'colorGray', '#dc2626': 'colorRed', '#ea580c': 'colorOrange',
    '#16a34a': 'colorGreen', '#2563eb': 'colorBlue', '#9333ea': 'colorPurple',
  }[color ?? 'default'] ?? 'colorDefault') as BlockShortcutName;
}

function fontSizeShortcutName(fontSize: string): BlockShortcutName {
  return ({
    '12px': 'fontSizeSmall',
    '14px': 'fontSizeBody',
    '16px': 'fontSizeMedium',
    '18px': 'fontSizeLarge',
    '20px': 'fontSizeXLarge',
  }[fontSize] ?? 'fontSizeBody') as BlockShortcutName;
}

function cascadeMenuTitle(menuView: CascadeMenuView) {
  return {
    alignment: '缩进和对齐',
    color: '文字颜色',
    fontSize: '字号',
  }[menuView];
}

function InlineButton({
  label,
  shortcut,
  active,
  icon,
  onRun,
}: {
  label: string;
  shortcut: string;
  active?: boolean;
  icon: ReactNode;
  onRun: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label={`${label}，快捷键 ${shortcut}`}
      title={`${label} · ${shortcut}`}
      className={`group relative flex h-8 w-8 items-center justify-center rounded-md ${active ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onRun(event);
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}，{shortcut}</span>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden w-max max-w-48 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-center text-[11px] font-normal leading-4 text-white shadow-lg group-focus-visible:block group-hover:block"
        role="tooltip"
      >
        {label} · {shortcut}
      </span>
    </button>
  );
}

function InlineColorPalette({
  colors,
  label,
  position,
  onSelect,
}: {
  colors: ReadonlyArray<{ label: string; value: string | null }>;
  label: string;
  position: { top: number; left: number };
  onSelect: (color: string | null) => void;
}) {
  return (
    <div
      aria-label={label}
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl"
      role="menu"
      style={position}
    >
      {colors.map((color) => (
        <button
          key={color.value ?? 'default'}
          aria-label={color.label}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          title={color.label}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(color.value);
          }}
        >
          <ColorSwatch color={color.value} />
        </button>
      ))}
    </div>
  );
}

function calloutLabel(kind: CalloutKind) {
  return { info: '信息', warning: '注意', success: '成功', danger: '危险' }[kind];
}

function calloutShortcutName(kind: CalloutKind): BlockShortcutName {
  return {
    info: 'calloutInfo',
    warning: 'calloutWarning',
    success: 'calloutSuccess',
    danger: 'calloutDanger',
  }[kind] as BlockShortcutName;
}

function updateTextStyleMark(
  editor: Editor,
  range: { from: number; to: number },
  patch: { color?: string | null; fontSize?: string | null; backgroundColor?: string | null },
) {
  const markType = editor.state.schema.marks.textStyle;
  if (!markType) {
    return false;
  }
  const tr = editor.state.tr;
  editor.state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (!node.isText) {
      return true;
    }
    const from = Math.max(range.from, pos);
    const to = Math.min(range.to, pos + node.nodeSize);
    const existing = node.marks.find((mark) => mark.type === markType);
    const attrs = { ...(existing?.attrs ?? {}) };
    Object.entries(patch).forEach(([key, value]) => {
      if (value) {
        attrs[key] = value;
      } else {
        delete attrs[key];
      }
    });
    const compactAttrs = Object.fromEntries(
      Object.entries(attrs).filter(([, value]) => (
        value !== null && value !== undefined && value !== ''
      )),
    );
    tr.removeMark(from, to, markType);
    if (Object.keys(compactAttrs).length) {
      tr.addMark(from, to, markType.create(compactAttrs));
    }
    return true;
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
    return true;
  }
  return false;
}

function isTextFormattingSelection(editor: Editor) {
  const selection = editor.state.selection;
  if (
    selection.empty
    || selection instanceof NodeSelection
    || selection instanceof CellSelection
  ) {
    return false;
  }

  let hasText = false;
  let containsExcludedNode = false;
  editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (TEXT_FORMATTING_EXCLUDED_NODE_TYPES.has(node.type.name)) {
      containsExcludedNode = true;
      return false;
    }
    if (node.isText) {
      hasText = true;
    }
    return true;
  });
  return hasText && !containsExcludedNode;
}

function updateFormattableBlockAttributes(
  editor: Editor,
  block: DocumentBlockTarget,
  attrs: Record<string, unknown>,
) {
  const textBlock = resolveFormattableTextBlockTarget(block);
  if (!textBlock) {
    return false;
  }
  const tr = editor.state.tr.setNodeMarkup(textBlock.pos, undefined, {
    ...textBlock.node.attrs,
    ...attrs,
  }, textBlock.node.marks);
  editor.view.dispatch(tr);
  return true;
}

interface ShortcutActions {
  editor: Editor;
  onSetLink: () => void;
  onInsertCodeBlock: (position: number) => void;
  onInsertImage: (position: number) => void;
  onReplaceImage: (position: number) => void;
  onEditImageAlt: (position: number) => void;
  onEditImageCaption: (position: number) => void;
  onInsertAttachment: (position: number) => void;
  onInsertMermaid: (position: number) => void;
  onInsertTable: (position: number) => void;
}

function runShortcutAction(
  name: BlockShortcutName,
  block: DocumentBlockTarget,
  actions: ShortcutActions,
) {
  const {
    editor,
    onSetLink,
    onInsertCodeBlock,
    onInsertImage,
    onReplaceImage,
    onEditImageAlt,
    onEditImageCaption,
    onInsertAttachment,
    onInsertMermaid,
    onInsertTable,
  } = actions;
  const focusBlock = () => editor.chain().focus().setTextSelection(block.selectionPos);
  const insert = (content: Record<string, unknown>) => (
    editor.chain().focus().insertContentAt(block.insertionPos, content).run()
  );
  const setCallout = (kind: CalloutKind) => {
    if (block.presentationType === 'callout') {
      return focusBlock().updateAttributes('callout', { kind }).run();
    }
    return insert({
      type: 'callout',
      attrs: { kind },
      content: [{ type: 'paragraph' }],
    });
  };

  switch (name) {
    case 'bold':
      return editor.chain().focus().toggleBold().run();
    case 'italic':
      return editor.chain().focus().toggleItalic().run();
    case 'underline':
      return editor.chain().focus().toggleUnderline().run();
    case 'strike':
      return editor.chain().focus().toggleStrike().run();
    case 'link':
      onSetLink();
      return true;
    case 'paragraph':
      return focusBlock().setParagraph().run();
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
    case 'heading5':
      return focusBlock().toggleHeading({ level: Number(name.slice(-1)) as 1 | 2 | 3 | 4 | 5 }).run();
    case 'bulletList':
      return focusBlock().toggleBulletList().run();
    case 'orderedList':
      return focusBlock().toggleOrderedList().run();
    case 'taskList':
      return focusBlock().toggleTaskList().run();
    case 'blockquote':
      return focusBlock().toggleBlockquote().run();
    case 'codeBlock':
      onInsertCodeBlock(block.selectionPos);
      return true;
    case 'horizontalRule':
      return insert({ type: 'horizontalRule' });
    case 'table':
      onInsertTable(block.selectionPos);
      return true;
    case 'image':
      onInsertImage(block.insertionPos);
      return true;
    case 'attachment':
      onInsertAttachment(block.insertionPos);
      return true;
    case 'mermaid':
      onInsertMermaid(block.insertionPos);
      return true;
    case 'calloutInfo':
      return setCallout('info');
    case 'calloutWarning':
      return setCallout('warning');
    case 'calloutSuccess':
      return setCallout('success');
    case 'calloutDanger':
      return setCallout('danger');
    case 'addColumn':
      return block.presentationType === 'table' && focusBlock().addColumnAfter().run();
    case 'deleteColumn':
      return block.presentationType === 'table' && focusBlock().deleteColumn().run();
    case 'addRow':
      return block.presentationType === 'table' && focusBlock().addRowAfter().run();
    case 'deleteRow':
      return block.presentationType === 'table' && focusBlock().deleteRow().run();
    case 'deleteTable':
      return block.presentationType === 'table' && focusBlock().deleteTable().run();
    case 'replaceImage':
      if (block.presentationType !== 'image') return false;
      onReplaceImage(block.pos);
      return true;
    case 'imageAlt':
      if (block.presentationType !== 'image') return false;
      onEditImageAlt(block.pos);
      return true;
    case 'imageCaption':
      if (block.presentationType !== 'image') return false;
      onEditImageCaption(block.pos);
      return true;
    case 'alignLeft':
    case 'alignCenter':
    case 'alignRight':
    case 'alignJustify': {
      const textAlign = { alignLeft: 'left', alignCenter: 'center', alignRight: 'right', alignJustify: 'justify' }[name];
      return updateFormattableBlockAttributes(editor, block, { textAlign });
    }
    case 'indentIncrease':
    case 'indentDecrease': {
      const delta = name === 'indentIncrease' ? 1 : -1;
      if (['bulletList', 'orderedList', 'taskList'].includes(block.presentationType)) {
        const itemType = block.presentationType === 'taskList' ? 'taskItem' : 'listItem';
        return delta > 0 ? focusBlock().sinkListItem(itemType).run() : focusBlock().liftListItem(itemType).run();
      }
      const textBlock = resolveFormattableTextBlockTarget(block);
      if (!textBlock) return false;
      return updateFormattableBlockAttributes(editor, block, {
        indent: normalizeBlockIndent(Number(textBlock.node.attrs.indent ?? 0) + delta),
      });
    }
    case 'colorDefault':
    case 'colorGray':
    case 'colorRed':
    case 'colorOrange':
    case 'colorGreen':
    case 'colorBlue':
    case 'colorPurple': {
      const range = getDocumentBlockTextRange(block);
      if (!range || range.from === range.to) return false;
      const color = {
        colorDefault: null, colorGray: '#4b5563', colorRed: '#dc2626', colorOrange: '#ea580c',
        colorGreen: '#16a34a', colorBlue: '#2563eb', colorPurple: '#9333ea',
      }[name];
      return updateTextStyleMark(editor, range, { color });
    }
    case 'backgroundColorDefault': {
      const { from, to } = editor.state.selection;
      const range = from === to ? getDocumentBlockTextRange(block) : { from, to };
      if (!range || range.from === range.to) return false;
      return updateTextStyleMark(editor, range, { backgroundColor: '#fff2cc' });
    }
    case 'fontSizeSmall':
    case 'fontSizeBody':
    case 'fontSizeMedium':
    case 'fontSizeLarge':
    case 'fontSizeXLarge': {
      if (!allowsFontSizeFormatting(block)) return false;
      const range = getDocumentBlockTextRange(block);
      if (!range || range.from === range.to) return false;
      const fontSize = {
        fontSizeSmall: '12px',
        fontSizeBody: '14px',
        fontSizeMedium: '16px',
        fontSizeLarge: '18px',
        fontSizeXLarge: '20px',
      }[name];
      return updateTextStyleMark(editor, range, { fontSize });
    }
    case 'duplicateNode':
      void copyNodeAsRichContent(block.node, editor.schema);
      return true;
    case 'deleteNode':
      return editor.chain().focus().deleteRange({ from: block.pos, to: block.end }).run();
    default:
      return false;
  }
}

function allowsFontSizeFormatting(block?: DocumentBlockTarget) {
  if (!block) return false;
  const textBlock = resolveFormattableTextBlockTarget(block);
  return Boolean(textBlock && textBlock.node.type.name !== 'heading');
}

async function copyNodeAsRichContent(node: ProseMirrorNode, schema: Schema): Promise<void> {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeNode(node));
  const html = container.innerHTML;
  const plainText = node.textBetween(0, node.content.size, '\n') || node.textContent;

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      // Fall through to the synchronous clipboard event for older/restricted browsers.
    }
  }

  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData('text/html', html);
    event.clipboardData?.setData('text/plain', plainText);
  };
  document.addEventListener('copy', handleCopy, { once: true });
  document.execCommand('copy');
}

function isMacPlatform() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}
