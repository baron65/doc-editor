import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOCK_SHORTCUTS,
  formatBlockShortcut,
  matchesBlockShortcut,
} from './blockShortcutModel.ts';

test('快捷键按平台显示 macOS 和 Windows 文案', () => {
  assert.equal(formatBlockShortcut(BLOCK_SHORTCUTS.heading2, true), '⌘⌥2');
  assert.equal(formatBlockShortcut(BLOCK_SHORTCUTS.heading2, false), 'Ctrl+Alt+2');
  assert.equal(formatBlockShortcut(BLOCK_SHORTCUTS.bulletList, true), '⌘⇧8');
  assert.equal(formatBlockShortcut(BLOCK_SHORTCUTS.addRow, false), 'Ctrl+Alt+↓');
});

test('快捷键精确匹配主修饰键和附加修饰键', () => {
  assert.equal(matchesBlockShortcut({
    code: 'Digit2', metaKey: true, ctrlKey: false, altKey: true, shiftKey: false,
  }, BLOCK_SHORTCUTS.heading2, true), true);
  assert.equal(matchesBlockShortcut({
    code: 'Digit2', metaKey: false, ctrlKey: true, altKey: true, shiftKey: false,
  }, BLOCK_SHORTCUTS.heading2, false), true);
  assert.equal(matchesBlockShortcut({
    code: 'Digit2', metaKey: true, ctrlKey: false, altKey: true, shiftKey: true,
  }, BLOCK_SHORTCUTS.heading2, true), false);
  assert.equal(matchesBlockShortcut({
    code: 'Digit2', metaKey: false, ctrlKey: true, altKey: true, shiftKey: false,
  }, BLOCK_SHORTCUTS.heading2, true), false);
});

test('每个块菜单工具都有唯一快捷键', () => {
  const signatures = Object.values(BLOCK_SHORTCUTS).map((shortcut) => [
    shortcut.code,
    shortcut.alt,
    shortcut.shift,
  ].join(':'));
  assert.equal(new Set(signatures).size, signatures.length);
});
