export const INITIAL_TABLE_GRID_SIZE = 5;
export const MAX_TABLE_DIMENSION = 20;

export function normalizeTableDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_TABLE_DIMENSION, Math.max(1, Math.round(value)));
}

export function expandTableGrid(current: number, hovered: number): number {
  if (current >= MAX_TABLE_DIMENSION || hovered < current) return current;
  return Math.min(MAX_TABLE_DIMENSION, current + 5);
}
