import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAFE_TEXT_COLORS,
  SAFE_TEXT_BACKGROUND_COLORS,
  SAFE_FONT_SIZES,
  buildBlockTextAlignHtmlAttributes,
  buildBlockTextStyle,
  normalizeBlockIndent,
  normalizeBlockTextAlign,
  normalizeFontSize,
  normalizeTextColor,
  normalizeTextBackgroundColor,
} from './blockFormatting.ts';

test('缩进限制在 0 到 6 级且对齐只接受安全枚举', () => {
  assert.equal(normalizeBlockIndent(-1), 0);
  assert.equal(normalizeBlockIndent(3.4), 3);
  assert.equal(normalizeBlockIndent(99), 6);
  assert.equal(normalizeBlockTextAlign('center'), 'center');
  assert.equal(normalizeBlockTextAlign('expression(alert(1))'), 'left');
});

test('文本颜色接受常见 CSS 色值并拒绝注入语法', () => {
  assert.equal(SAFE_TEXT_COLORS.length, 7);
  assert.equal(normalizeTextColor('#2563eb'), '#2563eb');
  assert.equal(normalizeTextColor('red'), 'red');
  assert.equal(normalizeTextColor('rgb(30, 64, 175)'), 'rgb(30, 64, 175)');
  assert.equal(normalizeTextColor('hsl(220, 70%, 50%)'), 'hsl(220, 70%, 50%)');
  assert.equal(normalizeTextColor('url(javascript:alert(1))'), null);
  assert.equal(normalizeTextColor('red; background: black'), null);
});

test('文本背景色接受常见 CSS 色值并拒绝注入语法', () => {
  assert.equal(SAFE_TEXT_BACKGROUND_COLORS.length, 6);
  assert.equal(normalizeTextBackgroundColor('#fff2cc'), '#fff2cc');
  assert.equal(normalizeTextBackgroundColor('yellow'), 'yellow');
  assert.equal(normalizeTextBackgroundColor('rgba(30, 64, 175, 0.2)'), 'rgba(30, 64, 175, 0.2)');
  assert.equal(normalizeTextBackgroundColor('url(javascript:alert(1))'), null);
});

test('字号接受合理范围并拒绝极端或注入值', () => {
  assert.equal(SAFE_FONT_SIZES.length, 5);
  assert.equal(normalizeFontSize('16px'), '16px');
  assert.equal(normalizeFontSize('13px'), '13px');
  assert.equal(normalizeFontSize('1.25rem'), '1.25rem');
  assert.equal(normalizeFontSize('120%'), '120%');
  assert.equal(normalizeFontSize('73px'), null);
  assert.equal(normalizeFontSize('4.1em'), null);
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
