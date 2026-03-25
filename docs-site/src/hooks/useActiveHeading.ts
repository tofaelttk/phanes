import { useEffect, useMemo, useState, type RefObject } from 'react';
import type { TocHeading } from '@/lib/headings';

/** Reading line from viewport top (sticky header height). */
const READ_LINE_PX = 88;

/** Y position of element top relative to scroll container content (for ordering). */
function offsetTopInScroller(el: HTMLElement, scroller: HTMLElement | null): number {
  if (!scroller) {
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY;
  }
  const er = el.getBoundingClientRect();
  const sr = scroller.getBoundingClientRect();
  return er.top - sr.top + scroller.scrollTop;
}

function sortIdsByDomOrder(ids: string[], scroller: HTMLElement | null): string[] {
  const pairs: { id: string; y: number }[] = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    pairs.push({ id, y: offsetTopInScroller(el, scroller) });
  }
  pairs.sort((a, b) => a.y - b.y);
  return pairs.map((p) => p.id);
}

function activeByReadingLine(sortedIds: string[]): string | null {
  if (sortedIds.length === 0) return null;
  let current = sortedIds[0];
  for (const id of sortedIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    const { top } = el.getBoundingClientRect();
    if (top <= READ_LINE_PX) current = id;
  }
  return current;
}

export function useActiveHeading(
  headings: TocHeading[],
  scrollRootRef: RefObject<HTMLElement | null>
): string | null {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const idKey = useMemo(() => ids.join('\0'), [ids]);

  const [active, setActive] = useState<string | null>(() => ids[0] ?? null);

  useEffect(() => {
    setActive(ids[0] ?? null);
  }, [idKey, ids]);

  useEffect(() => {
    if (ids.length === 0) {
      setActive(null);
      return;
    }

    const flush = () => {
      const root = scrollRootRef.current;
      const sorted = sortIdsByDomOrder(ids, root);
      if (sorted.length === 0) return;

      const next = activeByReadingLine(sorted);
      if (next) setActive((p) => (p === next ? p : next));
    };

    let raf = 0;
    let ticking = false;
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(() => {
        ticking = false;
        flush();
      });
    };

    schedule();

    const root = scrollRootRef.current;
    const scrollTarget: HTMLElement | Window = root ?? window;
    scrollTarget.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);

    const observers: IntersectionObserver[] = [];
    const ioRoot = root ?? null;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(schedule, {
        root: ioRoot,
        rootMargin: `-${READ_LINE_PX}px 0px -45% 0px`,
        threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
      });
      obs.observe(el);
      observers.push(obs);
    }

    const ro = new ResizeObserver(schedule);
    if (root) ro.observe(root);
    ro.observe(document.documentElement);
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'class'] });

    return () => {
      cancelAnimationFrame(raf);
      scrollTarget.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      observers.forEach((o) => o.disconnect());
      ro.disconnect();
      mo.disconnect();
    };
  }, [idKey, ids, scrollRootRef]);

  return active;
}
