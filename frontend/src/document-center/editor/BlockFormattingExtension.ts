import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import {
  buildBlockTextStyle,
  normalizeBlockIndent,
  normalizeBlockTextAlign,
  normalizeFontSize,
  normalizeTextColor,
} from '../content/blockFormatting';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockFormatting: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const TextColorMark = Mark.create({
  name: 'textStyle',
  priority: 101,

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => normalizeTextColor(element.getAttribute('data-text-color') ?? element.style.color),
        renderHTML: ({ color }) => {
          const safeColor = normalizeTextColor(color);
          return safeColor ? { 'data-text-color': safeColor, style: `color: ${safeColor}` } : {};
        },
      },
      fontSize: {
        default: null,
        parseHTML: (element) => normalizeFontSize(element.getAttribute('data-font-size') ?? element.style.fontSize),
        renderHTML: ({ fontSize }) => {
          const safeFontSize = normalizeFontSize(fontSize);
          return safeFontSize ? { 'data-font-size': safeFontSize, style: `font-size: ${safeFontSize}` } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-text-color]' }, { tag: 'span[data-font-size]' }, { style: 'color' }, { style: 'font-size' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor: (color) => ({ commands }) => {
        const safeColor = normalizeTextColor(color);
        return Boolean(safeColor) && commands.setMark(this.name, { color: safeColor });
      },
      unsetTextColor: () => ({ commands }) => commands.unsetMark(this.name),
      setFontSize: (fontSize) => ({ commands }) => {
        const safeFontSize = normalizeFontSize(fontSize);
        return Boolean(safeFontSize) && commands.setMark(this.name, { fontSize: safeFontSize });
      },
      unsetFontSize: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

export const BlockFormattingExtension = Extension.create({
  name: 'blockFormatting',

  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textAlign: {
          default: 'left',
          parseHTML: (element) => normalizeBlockTextAlign(element.getAttribute('data-text-align') ?? element.style.textAlign),
          renderHTML: (attrs) => {
            const textAlign = normalizeBlockTextAlign(attrs.textAlign);
            return { 'data-text-align': textAlign, style: buildBlockTextStyle({ textAlign }).textAlign };
          },
        },
        indent: {
          default: 0,
          parseHTML: (element) => normalizeBlockIndent(element.getAttribute('data-indent')),
          renderHTML: (attrs) => {
            const indent = normalizeBlockIndent(attrs.indent);
            return { 'data-indent': String(indent), style: `margin-left: ${indent * 24}px` };
          },
        },
      },
    }];
  },

  addExtensions() {
    return [TextColorMark];
  },
});
