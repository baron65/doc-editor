import { useState } from 'react';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { normalizeCodeLanguage } from '../code/codeLanguages';
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = normalizeCodeLanguage(language);
  const highlighted = hljs.getLanguage(normalizedLanguage)
    ? hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value
    : undefined;

  const copy = async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="my-5 overflow-hidden rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] [font-family:Consolas,'Courier_New',monospace]" data-code-language={normalizedLanguage}>
      <header className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-4 py-2 text-xs text-[#cccccc]">
        <span>{normalizedLanguage}</span>
        <button className="rounded px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-white" type="button" onClick={() => void copy()}>
          {copied ? '已复制' : '复制'}
        </button>
      </header>
      <pre className="m-0 overflow-x-auto bg-[#1e1e1e] p-4 text-sm leading-6">
        {highlighted ? (
          <code className={`hljs language-${normalizedLanguage}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code className="hljs text-gray-100">{code}</code>
        )}
      </pre>
    </section>
  );
}
