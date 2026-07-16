export interface CodeLanguage {
  value: string;
  label: string;
  aliases: readonly string[];
}

export const CODE_LANGUAGES = [
  { value: 'plaintext', label: '纯文本', aliases: ['text', 'txt'] },
  { value: 'bash', label: 'Bash', aliases: ['shell', 'sh'] },
  { value: 'css', label: 'CSS', aliases: [] },
  { value: 'xml', label: 'HTML / XML', aliases: ['html'] },
  { value: 'java', label: 'Java', aliases: [] },
  { value: 'javascript', label: 'JavaScript', aliases: ['js'] },
  { value: 'json', label: 'JSON', aliases: [] },
  { value: 'markdown', label: 'Markdown', aliases: ['md'] },
  { value: 'python', label: 'Python', aliases: ['py'] },
  { value: 'sql', label: 'SQL', aliases: [] },
  { value: 'typescript', label: 'TypeScript', aliases: ['ts'] },
  { value: 'yaml', label: 'YAML', aliases: ['yml'] },
] as const satisfies readonly CodeLanguage[];

const aliasToValue = new Map<string, string>(
  CODE_LANGUAGES.flatMap((item) =>
    [item.value, ...item.aliases].map((alias) => [alias, item.value] as const),
  ),
);

export function normalizeCodeLanguage(value?: string) {
  const normalized = value?.trim().toLowerCase() || 'plaintext';
  return aliasToValue.get(normalized) ?? normalized;
}

export function findCodeLanguage(value?: string) {
  const normalized = normalizeCodeLanguage(value);
  return CODE_LANGUAGES.find((item) => item.value === normalized);
}

export function filterCodeLanguages(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...CODE_LANGUAGES];
  return CODE_LANGUAGES.filter((item) =>
    [item.value, item.label, ...item.aliases].some((candidate) =>
      candidate.toLowerCase().includes(normalized),
    ),
  );
}
