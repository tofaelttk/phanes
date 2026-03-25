import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { highlightCode } from './shikiSingleton';

type Props = {
  code: string;
  language: string;
  className?: string;
};

export function CodeBlock({ code, language, className }: Props) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    highlightCode(code, language || 'text', colorMode).then((h) => {
      if (!cancelled) setHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, colorMode]);

  const copy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative my-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] overflow-hidden ${className ?? ''}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
        >
          {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin p-4 text-[13px] leading-relaxed">
        {html ? (
          <div
            className="[&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0! [&_code]:font-mono [&_code]:text-[13px]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap">{code}</pre>
        )}
      </div>
    </div>
  );
}
