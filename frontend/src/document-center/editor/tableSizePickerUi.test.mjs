import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./TableSizePicker.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../global.css', import.meta.url), 'utf8');

test('表格尺寸选择器提供可视网格和精确数字输入', () => {
  assert.match(source, /aria-label="表格尺寸选择"/);
  assert.match(source, /aria-label="表格行数"/);
  assert.match(source, /aria-label="表格列数"/);
  assert.match(source, /插入 \{rows\} × \{columns\} 表格/);
  assert.match(source, /onPointerEnter/);
  assert.match(source, /onInsert\(rows, columns\)/);
  assert.match(styles, /\.table-size-picker-grid/);
  assert.match(styles, /\.table-size-picker-cell\.is-selected/);
});

test('表格尺寸选择器支持按下后拖过网格并在释放时插入', () => {
  assert.match(source, /const \[dragging, setDragging\] = useState\(false\)/);
  assert.match(source, /onPointerDown=\{\(event\) => beginDrag/);
  assert.match(source, /onPointerEnter=\{\(\) => dragAcross/);
  assert.match(source, /onPointerUp=\{finishDrag\}/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /elementFromPoint/);
  assert.match(source, /onInsert\(dimensions\.row, dimensions\.column\)/);
});
