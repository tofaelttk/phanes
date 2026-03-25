import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

type Props = {
  code: string;
};

export function MermaidDiagram({ code }: Props) {
  const id = useId().replace(/:/g, '');
  const host = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setSvg(null);

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'strict',
          fontFamily: 'Inter, system-ui, sans-serif',
          themeVariables: {
            primaryColor: '#f0f1f3',
            primaryTextColor: '#23252a',
            primaryBorderColor: '#d0d1d6',
            lineColor: '#5e6ad2',
            secondaryColor: '#ffffff',
            tertiaryColor: '#f7f8f9',
          },
        });
        const { svg: out } = await mermaid.render(`mmd-${id}`, code);
        if (!cancelled) setSvg(out);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Mermaid render failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (err) {
    return (
      <div className="my-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Diagram error</p>
          <p className="text-red-700/80 mt-1 font-mono text-xs">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="my-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-6 overflow-x-auto scrollbar-thin"
      ref={host}
    >
      {svg ? (
        <div className="flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="h-24 flex items-center justify-center text-[var(--color-text-tertiary)] text-sm">
          Rendering diagram…
        </div>
      )}
    </div>
  );
}
