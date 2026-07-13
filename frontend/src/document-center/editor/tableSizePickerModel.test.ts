import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_TABLE_GRID_SIZE,
  MAX_TABLE_DIMENSION,
  expandTableGrid,
  normalizeTableDimension,
} from './tableSizePickerModel.ts';

test('表格尺寸限制在 1 到 20', () => {
  assert.equal(MAX_TABLE_DIMENSION, 20);
  assert.equal(INITIAL_TABLE_GRID_SIZE, 5);
  assert.equal(normalizeTableDimension(-1), 1);
  assert.equal(normalizeTableDimension(8.8), 9);
  assert.equal(normalizeTableDimension(30), 20);
  assert.equal(normalizeTableDimension(Number.NaN), 1);
});

test('悬停到网格边缘时以五格为步长扩展', () => {
  assert.equal(expandTableGrid(5, 4), 5);
  assert.equal(expandTableGrid(5, 5), 10);
  assert.equal(expandTableGrid(10, 10), 15);
  assert.equal(expandTableGrid(20, 20), 20);
});
