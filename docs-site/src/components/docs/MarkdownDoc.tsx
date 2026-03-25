import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import type { Components } from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './MermaidDiagram';
import { SectionPermalink } from './SectionPermalink';

type Props = {
  markdown: string;
};

export function MarkdownDoc({ markdown }: Props) {
  const components: Components = {
    pre({ children }) {
      return <>{children}</>;
    },
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1] ?? '';
      const code = String(children).replace(/\n$/, '');
      if (lang === 'mermaid') {
        return <MermaidDiagram code={code} />;
      }
      if (!className) {
        return (
          <code className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-[var(--color-bg-muted)] text-[var(--color-text)] border border-[var(--color-border)]">
            {children}
          </code>
        );
      }
      return <CodeBlock code={code} language={lang} />;
    },
    h2({ id, children }) {
      return (
        <h2 id={id} className="group flex flex-wrap items-baseline gap-x-2">
          {id ? <SectionPermalink id={id} iconSize={15} /> : null}
          <span className="min-w-0 flex-1">{children}</span>
        </h2>
      );
    },
    h3({ id, children }) {
      return (
        <h3 id={id} className="group flex flex-wrap items-baseline gap-x-2">
          {id ? <SectionPermalink id={id} iconSize={14} /> : null}
          <span className="min-w-0 flex-1">{children}</span>
        </h3>
      );
    },
    h4({ id, children }) {
      return (
        <h4 id={id} className="group flex flex-wrap items-baseline gap-x-2">
          {id ? <SectionPermalink id={id} iconSize={13} /> : null}
          <span className="min-w-0 flex-1">{children}</span>
        </h4>
      );
    },
    h5({ id, children }) {
      return (
        <h5 id={id} className="group flex flex-wrap items-baseline gap-x-2">
          {id ? <SectionPermalink id={id} iconSize={12} /> : null}
          <span className="min-w-0 flex-1">{children}</span>
        </h5>
      );
    },
    h6({ id, children }) {
      return (
        <h6 id={id} className="group flex flex-wrap items-baseline gap-x-2">
          {id ? <SectionPermalink id={id} iconSize={12} /> : null}
          <span className="min-w-0 flex-1">{children}</span>
        </h6>
      );
    },
    a({ href, children }) {
      const external = href?.startsWith('http');
      return (
        <a
          href={href}
          className="text-[var(--color-link)] font-medium underline-offset-2 hover:underline"
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className="my-6 overflow-x-auto rounded-lg border border-[var(--color-border)] scrollbar-thin">
          <table className="w-full min-w-[32rem] border-collapse text-sm">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-[var(--color-bg-subtle)]">{children}</thead>;
    },
    th({ children }) {
      return (
        <th className="border-b border-[var(--color-border)] px-3 py-2.5 text-left font-semibold text-[var(--color-text)]">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="border-b border-[var(--color-border)] px-3 py-2.5 text-[var(--color-text-secondary)]">{children}</td>;
    },
    tr({ children }) {
      return <tr className="hover:bg-[var(--color-bg-subtle)]/80 transition-colors">{children}</tr>;
    },
  };

  return (
    <article className="doc-prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
