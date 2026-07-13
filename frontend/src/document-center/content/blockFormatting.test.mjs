import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAFE_TEXT_COLORS,
  SAFE_FONT_SIZES,
  buildBlockTextAlignHtmlAttributes,
  buildBlockTextStyle,
  normalizeBlockIndent,
  normalizeBlockTextAlign,
  normalizeFontSize,
  normalizeTextColor,
} from './blockFormatting.ts';

test('缩进限制在 0 到 6 级且对齐只接受安全枚举', () => {
  assert.equal(normalizeBlockIndent(-1), 0);
  assert.equal(normalizeBlockIndent(3.4), 3);
  assert.equal(normalizeBlockIndent(99), 6);
  assert.equal(normalizeBlockTextAlign('center'), 'center');
  assert.equal(normalizeBlockTextAlign('expression(alert(1))'), 'left');
});

test('文本颜色只接受固定安全色板', () => {
  assert.equal(SAFE_TEXT_COLORS.length, 7);
  assert.equal(normalizeTextColor('#2563eb'), '#2563eb');
  assert.equal(normalizeTextColor('red'), null);
  assert.equal(normalizeTextColor('url(javascript:alert(1))'), null);
});

test('字号只接受固定安全字号', () => {
  assert.equal(SAFE_FONT_SIZES.length, 5);
  assert.equal(normalizeFontSize('16px'), '16px');
  assert.equal(normalizeFontSize('13px'), null);
  assert.equal(normalizeFontSize('expression(alert(1))'), null);
});

test('Reader 样式只由规范化属性生成', () => {
  assert.deepEqual(buildBlockTextStyle({ textAlign: 'right', indent: 2 }), {
    textAlign: 'right',
    marginLeft: '48px',
  });
  assert.deepEqual(buildBlockTextStyle({ textAlign: 'invalid', indent: 20 }), {
    textAlign: 'left',
    marginLeft: '144px',
  });
});

test('编辑器对齐属性输出完整 CSS 声明', () => {
  assert.deepEqual(buildBlockTextAlignHtmlAttributes('center'), {
    'data-text-align': 'center',
    style: 'text-align: center',
  });
});
