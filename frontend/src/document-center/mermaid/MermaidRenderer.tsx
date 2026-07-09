import { useEffect, useId, useState } from 'react';

interface MermaidRendererProps {
  source: string;
}

let mermaidInitialized = false;

export function MermaidRenderer({ source }: MermaidRendererProps) {
  const id = useId().replace(/:/g, '_');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function render() {
      setError('');
      setSvg('');
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'default',
          });
          mermaidInitialized = true;
        }
        const { svg: renderedSvg } = await mermaid.render(`doc_center_mermaid_${id}`, source);
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : 'Mermaid 渲染失败');
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        <div className="font-medium">Mermaid 渲染失败</div>
        <pre className="mt-2 whitespace-pre-wrap break-all text-xs">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        Mermaid 渲染中...
      </div>
    );
  }

  return (
    <div
      className="mermaid-renderer overflow-auto rounded-xl border border-gray-100 bg-white p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
