export const SAFE_TEXT_COLORS = [
  { label: '默认', value: null },
  { label: '灰色', value: '#4b5563' },
  { label: '红色', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#9333ea' },
] as const;

export const SAFE_TEXT_BACKGROUND_COLORS = [
  { label: '默认', value: null },
  { label: '黄色', value: '#fff2cc' },
  { label: '蓝色', value: '#dbeafe' },
  { label: '绿色', value: '#dcfce7' },
  { label: '红色', value: '#fee2e2' },
  { label: '紫色', value: '#f3e8ff' },
] as const;

export const SAFE_FONT_SIZES = [
  { label: '小号', value: '12px' },
  { label: '正文', value: '14px' },
  { label: '中号', value: '16px' },
  { label: '大号', value: '18px' },
  { label: '特大', value: '20px' },
] as const;

export type BlockTextAlign = 'left' | 'center' | 'right' | 'justify';

const SAFE_TEXT_COLOR_VALUES = new Set<string>(
  SAFE_TEXT_COLORS.flatMap(({ value }) => value ? [value] : []),
);
const SAFE_TEXT_BACKGROUND_COLOR_VALUES = new Set<string>(
  SAFE_TEXT_BACKGROUND_COLORS.flatMap(({ value }) => value ? [value] : []),
);
const SAFE_FONT_SIZE_VALUES = new Set<string>(SAFE_FONT_SIZES.map(({ value }) => value));

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

export function normalizeTextBackgroundColor(value: unknown): string | null {
  return typeof value === 'string' && SAFE_TEXT_BACKGROUND_COLOR_VALUES.has(value) ? value : null;
}

export function normalizeFontSize(value: unknown): string | null {
  return typeof value === 'string' && SAFE_FONT_SIZE_VALUES.has(value) ? value : null;
}

export function buildBlockTextAlignHtmlAttributes(value: unknown) {
  const textAlign = normalizeBlockTextAlign(value);
  return {
    'data-text-align': textAlign,
    style: `text-align: ${textAlign}`,
  };
}

export function buildBlockTextStyle(attrs?: Record<string, unknown>) {
  return {
    textAlign: normalizeBlockTextAlign(attrs?.textAlign),
    marginLeft: `${normalizeBlockIndent(attrs?.indent) * 24}px`,
  };
}
