import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { MarkdownDoc } from '@/components/docs/MarkdownDoc';
import { SectionPermalink } from '@/components/docs/SectionPermalink';
import { TableOfContents } from '@/components/docs/TableOfContents';
import { useMainScrollRef } from '@/context/MainScrollContext';
import { extractTitle, getDocContent, stripFirstHeading } from '@/lib/content';
import { extractToc, slugify } from '@/lib/headings';
import { useActiveHeading } from '@/hooks/useActiveHeading';

export default function DocPage() {
  const { '*': splat } = useParams();
  const slug = splat && splat.length > 0 ? splat : 'overview';
  const raw = getDocContent(slug);
  const body = raw ? stripFirstHeading(raw) : '';
  const headings = useMemo(() => (raw ? extractToc(body) : []), [raw, body]);
  const mainScrollRef = useMainScrollRef();
  const activeId = useActiveHeading(headings, mainScrollRef);

  if (!raw) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-24 text-center">
        <FileQuestion size={40} className="text-[var(--color-text-tertiary)] mb-4" />
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Page not found</h1>
        <p className="text-[var(--color-text-secondary)] mt-2 max-w-md text-sm">
          No document at <code className="font-mono text-[var(--color-text)] bg-[var(--color-bg-muted)] px-1 rounded">{slug}</code>
        </p>
        <Link to="/docs/overview" className="mt-6 text-sm font-medium text-[var(--color-link)] hover:underline">
          Go to overview
        </Link>
      </div>
    );
  }

  const title = extractTitle(raw);
  const titleId = slugify(title);

  return (
    <div className="flex w-full min-h-full min-w-0 justify-center px-4 sm:px-5 lg:px-6 py-8 lg:py-10">
      <div className="flex w-full max-w-[min(85rem,calc(100vw-1.5rem))] items-start justify-center gap-6 lg:gap-7 min-w-0">
        <div className="min-w-0 w-full max-w-[40rem]">
          <header className="mb-10">
            <h1
              id={titleId}
              className="group flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl sm:text-[2rem] font-semibold tracking-tight text-[var(--color-text)] leading-tight scroll-mt-6"
            >
              <span className="min-w-0">{title}</span>
              <SectionPermalink id={titleId} iconSize={18} />
            </h1>
          </header>

          <MarkdownDoc markdown={body} />
        </div>

        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] py-8 pl-5 pr-3 sticky top-0 self-start max-h-[min(calc(100dvh-8.5rem),calc(100%-1rem))] min-h-0 overflow-hidden">
          <TableOfContents headings={headings} activeId={activeId} />
        </aside>
      </div>
    </div>
  );
}
