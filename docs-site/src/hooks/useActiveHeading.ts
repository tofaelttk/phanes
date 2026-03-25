import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { TocHeading } from '@/lib/headings';

/** When within this distance of scroll bottom, pin the last TOC entry (short final sections). */
const BOTTOM_PIN_SLACK_PX = 48;

/** Fine-grained thresholds so IntersectionObserver fires while headings move through the scrollport. */
function buildThresholds(steps = 32): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => i / steps);
}

function sortIdsByDomOrder(ids: string[], root: HTMLElement | null): string[] {
  if (!root) return [...ids];
  const pairs: { id: string; y: number }[] = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const er = el.getBoundingClientRect();
    const sr = root.getBoundingClientRect();
    pairs.push({ id, y: er.top - sr.top + root.scrollTop });
  }
  pairs.sort((a, b) => a.y - b.y);
  return pairs.map((p) => p.id);
}

/**
 * Modern scroll-spy logic (IntersectionObserver–friendly):
 * - Among headings that intersect the scrollport, pick the one **closest to the top**
 *   (smallest `relTop` = top edge nearest the top of the scroll container).
 * - Bottom-of-page override when the user reaches the end (short last sections).
 * - If nothing matches (edge case), keep previous active or fall back to first id.
 */
function computeActiveId(
  sortedIds: string[],
  root: HTMLElement | null,
  previous: string | null
): string | null {
  if (sortedIds.length === 0) return null;
  if (!root) return sortedIds[0];

  const st = root.scrollTop;
  const vh = root.clientHeight;
  const sh = root.scrollHeight;
  const rootRect = root.getBoundingClientRect();
  const hasScrollRoom = sh > vh + 2;

  if (hasScrollRoom && st + vh >= sh - BOTTOM_PIN_SLACK_PX) {
    return sortedIds[sortedIds.length - 1];
  }

  let bestId: string | null = null;
  let bestTop = Infinity;

  for (const id of sortedIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const relTop = r.top - rootRect.top;
    const relBottom = r.bottom - rootRect.top;
    if (relBottom <= 0 || relTop >= vh) continue;
    if (relTop < bestTop) {
      bestTop = relTop;
      bestId = id;
    }
  }

  if (bestId !== null) return bestId;
  return previous && sortedIds.includes(previous) ? previous : sortedIds[0];
}

export function useActiveHeading(
  headings: TocHeading[],
  scrollRootRef: RefObject<HTMLElement | null>
): string | null {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const idKey = useMemo(() => ids.join('\0'), [ids]);

  const [active, setActive] = useState<string | null>(() => ids[0] ?? null);
  const previousRef = useRef<string | null>(ids[0] ?? null);

  useLayoutEffect(() => {
    const first = ids[0] ?? null;
    previousRef.current = first;
    setActive(first);
  }, [idKey, ids]);

  useLayoutEffect(() => {
    if (ids.length === 0) {
      setActive(null);
      previousRef.current = null;
      return;
    }

    let raf = 0;
    let rafRetry = 0;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    const flush = () => {
      const root = scrollRootRef.current;
      if (!root) return;
      const sorted = sortIdsByDomOrder(ids, root);
      if (sorted.length === 0) return;
      const next = computeActiveId(sorted, root, previousRef.current);
      if (next) {
        previousRef.current = next;
        setActive((p) => (p === next ? p : next));
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        flush();
      });
    };

    const thresholds = buildThresholds(40);

    const setup = () => {
      const root = scrollRootRef.current;
      if (!root) {
        rafRetry = requestAnimationFrame(() => {
          if (!cancelled) setup();
        });
        return;
      }

      const io = new IntersectionObserver(() => schedule(), {
        root,
        rootMargin: '0px 0px 0px 0px',
        threshold: thresholds,
      });

      const observeHeadings = () => {
        io.disconnect();
        const sorted = sortIdsByDomOrder(ids, root);
        for (const id of sorted) {
          const el = document.getElementById(id);
          if (el) io.observe(el);
        }
      };

      observeHeadings();
      flush();

      const onScroll = () => schedule();
      root.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', schedule);

      const ro = new ResizeObserver(schedule);
      ro.observe(root);

      const mo = new MutationObserver(() => {
        observeHeadings();
        schedule();
      });
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });

      dispose = () => {
        io.disconnect();
        root.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', schedule);
        ro.disconnect();
        mo.disconnect();
      };
    };

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafRetry);
      dispose?.();
    };
  }, [idKey, ids, scrollRootRef]);

  return active;
}
