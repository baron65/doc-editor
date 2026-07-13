export interface BlockShortcut {
  code: string;
  alt?: boolean;
  shift?: boolean;
}

export interface ShortcutKeyboardEvent {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export const BLOCK_SHORTCUTS = {
  bold: { code: 'KeyB' },
  italic: { code: 'KeyI' },
  underline: { code: 'KeyU' },
  link: { code: 'KeyK' },
  paragraph: { code: 'Digit0', alt: true },
  heading1: { code: 'Digit1', alt: true },
  heading2: { code: 'Digit2', alt: true },
  heading3: { code: 'Digit3', alt: true },
  heading4: { code: 'Digit4', alt: true },
  heading5: { code: 'Digit5', alt: true },
  bulletList: { code: 'Digit8', shift: true },
  orderedList: { code: 'Digit7', shift: true },
  blockquote: { code: 'KeyB', shift: true },
  codeBlock: { code: 'KeyC', alt: true },
  horizontalRule: { code: 'Minus', alt: true },
  table: { code: 'KeyT', alt: true },
  image: { code: 'KeyP', alt: true },
  attachment: { code: 'KeyF', alt: true },
  mermaid: { code: 'KeyM', alt: true },
  calloutInfo: { code: 'Digit1', alt: true, shift: true },
  calloutWarning: { code: 'Digit2', alt: true, shift: true },
  calloutSuccess: { code: 'Digit3', alt: true, shift: true },
  calloutDanger: { code: 'Digit4', alt: true, shift: true },
  addColumn: { code: 'ArrowRight', alt: true },
  deleteColumn: { code: 'ArrowRight', alt: true, shift: true },
  addRow: { code: 'ArrowDown', alt: true },
  deleteRow: { code: 'ArrowDown', alt: true, shift: true },
  deleteTable: { code: 'Backspace', alt: true },
  replaceImage: { code: 'KeyR', alt: true },
  imageAlt: { code: 'KeyE', alt: true },
  imageCaption: { code: 'KeyG', alt: true },
  alignLeft: { code: 'KeyL', alt: true, shift: true },
  alignCenter: { code: 'KeyC', alt: true, shift: true },
  alignRight: { code: 'KeyR', alt: true, shift: true },
  alignJustify: { code: 'KeyJ', alt: true, shift: true },
  indentDecrease: { code: 'BracketLeft' },
  indentIncrease: { code: 'BracketRight' },
  colorDefault: { code: 'KeyX', alt: true, shift: true },
  colorGray: { code: 'KeyG', alt: true, shift: true },
  colorRed: { code: 'KeyD', alt: true, shift: true },
  colorOrange: { code: 'KeyO', alt: true, shift: true },
  colorGreen: { code: 'KeyN', alt: true, shift: true },
  colorBlue: { code: 'KeyU', alt: true, shift: true },
  colorPurple: { code: 'KeyV', alt: true, shift: true },
  duplicateNode: { code: 'KeyD', shift: true },
  deleteNode: { code: 'Backspace', shift: true },
} as const satisfies Record<string, BlockShortcut>;

export type BlockShortcutName = keyof typeof BLOCK_SHORTCUTS;

export function formatBlockShortcut(shortcut: BlockShortcut, isMac: boolean) {
  const key = shortcutKeyLabel(shortcut.code);
  if (isMac) {
    return `⌘${shortcut.alt ? '⌥' : ''}${shortcut.shift ? '⇧' : ''}${key}`;
  }
  return `Ctrl${shortcut.alt ? '+Alt' : ''}${shortcut.shift ? '+Shift' : ''}+${key}`;
}

export function matchesBlockShortcut(
  event: ShortcutKeyboardEvent,
  shortcut: BlockShortcut,
  isMac: boolean,
) {
  return event.code === shortcut.code
    && (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
    && event.altKey === Boolean(shortcut.alt)
    && event.shiftKey === Boolean(shortcut.shift);
}

function shortcutKeyLabel(code: string) {
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  if (code.startsWith('Key')) {
    return code.slice(3);
  }
  return {
    Minus: '-',
    ArrowRight: '→',
    ArrowDown: '↓',
    Backspace: '⌫',
    BracketLeft: '[',
    BracketRight: ']',
  }[code] ?? code;
}
