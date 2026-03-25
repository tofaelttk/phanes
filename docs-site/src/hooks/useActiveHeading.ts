import { useEffect, useMemo, useState } from 'react';
import type { TocHeading } from '@/lib/headings';

const READ_LINE_PX = 88;
const BOTTOM_PIN_PX = 120;
const LAST_BLOCK_TAIL_PX = 72;

function documentScrollHeight(): number {
  const { documentElement: de, body } = document;
  return Math.max(de.scrollHeight, de.clientHeight, body?.scrollHeight ?? 0, body?.clientHeight ?? 0);
}

/** Document Y-order — avoids skips when extract order and painted order differ. */
function sortIdsByDomOrder(ids: string[]): string[] {
  const pairs: { id: string; y: number }[] = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    pairs.push({ id, y: el.getBoundingClientRect().top + window.scrollY });
  }
  pairs.sort((a, b) => a.y - b.y);
  return pairs.map((p) => p.id);
}

function shouldPinToLastHeading(ids: string[], scrollY: number, vh: number, sh: number): boolean {
  if (ids.length === 0) return false;
  const lastEl = document.getElementById(ids[ids.length - 1]);
  if (!lastEl) return scrollY + vh >= sh - BOTTOM_PIN_PX;

  const lastRect = lastEl.getBoundingClientRect();
  const lastBottomDoc = lastRect.bottom + scrollY;
  const viewBottom = scrollY + vh;

  if (viewBottom >= sh - BOTTOM_PIN_PX) return true;
  if (lastRect.height > 0 && viewBottom >= lastBottomDoc - LAST_BLOCK_TAIL_PX) return true;
  return false;
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

export function useActiveHeading(headings: TocHeading[]): string | null {
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
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const sh = documentScrollHeight();
      const sorted = sortIdsByDomOrder(ids);
      if (sorted.length === 0) return;

      if (shouldPinToLastHeading(sorted, scrollY, vh, sh)) {
        const last = sorted[sorted.length - 1];
        setActive((p) => (p === last ? p : last));
        return;
      }

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

    const observers: IntersectionObserver[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(schedule, {
        root: null,
        rootMargin: `-${READ_LINE_PX}px 0px -45% 0px`,
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
      });
      obs.observe(el);
      observers.push(obs);
    }

    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'class'] });

    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      mo.disconnect();
    };
  }, [idKey, ids]);

  return active;
}
