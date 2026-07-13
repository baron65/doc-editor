export const SAFE_TEXT_COLORS = [
  { label: '默认', value: null },
  { label: '灰色', value: '#4b5563' },
  { label: '红色', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#9333ea' },
] as const;

export type BlockTextAlign = 'left' | 'center' | 'right' | 'justify';

const SAFE_TEXT_COLOR_VALUES = new Set<string>(
  SAFE_TEXT_COLORS.flatMap(({ value }) => value ? [value] : []),
);

export function normalizeBlockTextAlign(value: unknown): BlockTextAlign {
  return ['left', 'center', 'right', 'justify'].includes(String(value))
    ? value as BlockTextAlign
    : 'left';
}

export function normalizeBlockIndent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(6, Math.round(numeric)));
}

export function normalizeTextColor(value: unknown): string | null {
  return typeof value === 'string' && SAFE_TEXT_COLOR_VALUES.has(value) ? value : null;
}

export function buildBlockTextStyle(attrs?: Record<string, unknown>) {
  return {
    textAlign: normalizeBlockTextAlign(attrs?.textAlign),
    marginLeft: `${normalizeBlockIndent(attrs?.indent) * 24}px`,
  };
}
