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
import { getCodeLineNumbers } from '../code/codeLineNumbers';
import { copyText } from '../copyText';
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
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const normalizedLanguage = normalizeCodeLanguage(language);
  const lineNumbers = getCodeLineNumbers(code);
  const highlighted = hljs.getLanguage(normalizedLanguage)
    ? hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value
    : undefined;

  const copy = async () => {
    const copied = await copyText(code);
    setCopyState(copied ? 'copied' : 'failed');
    window.setTimeout(() => setCopyState('idle'), 1600);
  };

  return (
    <section className="my-5 overflow-hidden rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] [font-family:Consolas,'Courier_New',monospace]" data-code-language={normalizedLanguage}>
      <header className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-4 py-2 text-xs text-[#cccccc]">
        <span>{normalizedLanguage}</span>
        <button className="rounded px-2 py-1 text-gray-300 hover:bg-gray-800 hover:text-white" type="button" onClick={() => void copy()}>
          {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制'}
        </button>
      </header>
      <div className="flex min-w-0 bg-[#1e1e1e]">
        <ol aria-hidden="true" className="code-line-numbers m-0 list-none shrink-0 select-none border-r border-[#3c3c3c] bg-[#1e1e1e] py-4 pr-3 text-right text-sm leading-6 text-[#858585]">
          {lineNumbers.map((lineNumber) => <li key={lineNumber}>{lineNumber}</li>)}
        </ol>
        <pre className="m-0 min-w-0 flex-1 overflow-x-auto bg-[#1e1e1e] p-4 text-sm leading-6">
          {highlighted ? (
            <code className={`hljs language-${normalizedLanguage}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
          ) : (
            <code className="hljs text-gray-100">{code}</code>
          )}
        </pre>
      </div>
    </section>
  );
}
