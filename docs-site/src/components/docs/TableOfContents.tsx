import { useEffect, useRef } from 'react';
import type { TocHeading } from '@/lib/headings';

type Props = {
  headings: TocHeading[];
  activeId: string | null;
};

function depthPad(depth: number): number {
  return 10 + Math.max(0, depth - 2) * 11;
}

function depthTextClass(depth: number): string {
  if (depth <= 2) return 'text-[13px]';
  if (depth === 3) return 'text-[12.5px]';
  return 'text-[12px]';
}

export function TableOfContents({ headings, activeId }: Props) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const want = `#${activeId}`;
    const a = Array.from(navRef.current.querySelectorAll<HTMLAnchorElement>('a')).find(
      (el) => el.getAttribute('href') === want
    );
    a?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  if (headings.length === 0) {
    return (
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <p className="text-[12px] text-[var(--color-text-tertiary)] leading-relaxed">No headings in body.</p>
      </div>
    );
  }

  return (
    <nav
      ref={navRef}
      className="flex flex-col min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1 -mr-1"
      aria-label="Page sections"
    >
      <div className="relative min-w-0">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-[var(--color-border)]" aria-hidden />
        <ul className="space-y-0 min-w-0">
          {headings.map((h, i) => {
            const active = activeId === h.id;
            const pl = depthPad(h.depth);
            return (
              <li key={`${h.id}-${i}`} className="relative">
                <a
                  href={`#${h.id}`}
                  style={{
                    paddingLeft: pl,
                    borderLeftColor: active ? 'var(--color-text)' : 'transparent',
                  }}
                  className={`block border-l-2 border-solid py-1.5 -ml-px leading-snug transition-[color,border-color] duration-150 ${depthTextClass(h.depth)} ${
                    active
                      ? 'font-semibold text-[var(--color-text)]'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
