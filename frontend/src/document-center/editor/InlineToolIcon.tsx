export type InlineToolIconType =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'link'
  | 'code'
  | 'text-color'
  | 'background-color';

export function InlineToolIcon({ type }: { type: InlineToolIconType }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg {...common} aria-hidden="true">
      {type === 'bold' ? <path d="M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z" /> : null}
      {type === 'italic' ? <><path d="M10 4h8M6 20h8M14 4 10 20" /></> : null}
      {type === 'strike' ? <><path d="M8 5c1-1 2.4-1.5 4-1.5 2.8 0 4.5 1.4 4.5 3.5M7 17c1 2.2 3 3.5 5.5 3.5 2.7 0 4.5-1.4 4.5-3.5" /><path d="M4 12h16" /></> : null}
      {type === 'underline' ? <><path d="M8 4v7a4 4 0 0 0 8 0V4M6 20h12" /></> : null}
      {type === 'link' ? <><path d="M10 13.5a4 4 0 0 0 5.7.1l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1" /><path d="M14 10.5a4 4 0 0 0-5.7-.1l-2 2A4 4 0 0 0 12 18.1l1.1-1.1" /></> : null}
      {type === 'code' ? <><path d="m9 5-4 7 4 7M15 5l4 7-4 7" /></> : null}
      {type === 'text-color' ? <><path d="m6 17 5-11h2l5 11M8.2 13h7.6" /><path d="M5 21h14" stroke="#2563eb" strokeWidth="3" /></> : null}
      {type === 'background-color' ? <><rect x="4" y="3" width="16" height="18" rx="2" fill="#fff2cc" stroke="none" /><path d="m7 17 5-11h2l5 11M9.2 13h5.6" stroke="#1f2937" /></> : null}
    </svg>
  );
}
