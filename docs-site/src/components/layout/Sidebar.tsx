import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { NAV_SECTIONS } from '@/config/navigation';
import { useMainScrollRef } from '@/context/MainScrollContext';

export function Sidebar() {
  const mainScrollRef = useMainScrollRef();
  const loc = useLocation();
  const pathSlug = loc.pathname.replace(/^\/docs\/?/, '') || 'overview';
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_SECTIONS.map((s) => [s.id, true]))
  );

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      NAV_SECTIONS.forEach((s) => {
        if (s.items.some((i) => i.slug === pathSlug)) next[s.id] = true;
      });
      return next;
    });
  }, [pathSlug]);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] min-h-0 h-full overflow-hidden">
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scrollbar-thin p-3 pt-4">
        {NAV_SECTIONS.map((section) => {
          const sectionHasCurrentPage = section.items.some((i) => i.slug === pathSlug);
          return (
            <div key={section.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className={`flex w-full items-center justify-between px-2 py-2 text-left text-[13px] font-medium outline-none focus-visible:outline-none border-0 rounded-none shadow-none bg-transparent active:bg-transparent ${
                  sectionHasCurrentPage
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-tertiary)]'
                } hover:text-[var(--color-text-secondary)]`}
              >
                {section.label}
                <motion.span animate={{ rotate: open[section.id] ? 0 : -90 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={14} className="text-[var(--color-text-tertiary)] opacity-90" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open[section.id] && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-0.5 overflow-hidden pl-1 pb-2"
                  >
                    {section.items.map((item) => {
                      const active = pathSlug === item.slug;
                      return (
                        <li key={item.slug}>
                          <Link
                            to={`/docs/${item.slug}`}
                            onClick={() => {
                              const el = mainScrollRef.current;
                              if (el) el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                            }}
                            className={`block px-2.5 py-1.5 text-[14px] leading-snug transition-colors outline-none focus-visible:outline-none rounded-none border-0 shadow-none bg-transparent ${
                              active
                                ? 'text-[var(--color-text)] font-semibold'
                                : 'text-[var(--color-text-secondary)] font-normal hover:text-[var(--color-text)]'
                            }`}
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
