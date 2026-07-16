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

const DANGEROUS_STYLE_VALUE = /(?:url\s*\(|expression\s*\(|javascript\s*:|@import|[;<>])/i;
const HEX_COLOR = /^#[\da-f]{3,8}$/i;
const FUNCTION_COLOR = /^(?:rgba?|hsla?)\(\s*[-\d.%\s,/]+\)$/i;
const NAMED_COLOR = /^[a-z]{1,32}$/i;
const FONT_SIZE = /^(\d+(?:\.\d{1,2})?)(px|em|rem|pt|%)$/i;

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
  return normalizeCssColor(value);
}

export function normalizeTextBackgroundColor(value: unknown): string | null {
  return normalizeCssColor(value);
}

export function normalizeFontSize(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (DANGEROUS_STYLE_VALUE.test(normalized)) return null;
  const match = FONT_SIZE.exec(normalized);
  if (!match) return null;
  const size = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(size)) return null;
  if (unit === 'px') return size >= 8 && size <= 72 ? normalized : null;
  if (unit === 'pt') return size >= 6 && size <= 54 ? normalized : null;
  if (unit === '%') return size >= 50 && size <= 400 ? normalized : null;
  return size >= 0.5 && size <= 4 ? normalized : null;
}

function normalizeCssColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 80 || DANGEROUS_STYLE_VALUE.test(normalized)) return null;
  return HEX_COLOR.test(normalized) || FUNCTION_COLOR.test(normalized) || NAMED_COLOR.test(normalized)
    ? normalized
    : null;
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
