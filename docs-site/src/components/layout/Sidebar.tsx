import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { NAV_SECTIONS } from '@/config/navigation';

export function Sidebar() {
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
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] min-h-[calc(100vh-3.5rem)] sticky top-14 self-start max-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 pt-4">
        {NAV_SECTIONS.map((section) => {
          const sectionHasCurrentPage = section.items.some((i) => i.slug === pathSlug);
          return (
            <div key={section.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className={`flex w-full items-center justify-between px-2 py-2 text-left text-[13px] font-medium outline-none focus-visible:ring-0 border-0 rounded-none ring-0 shadow-none active:bg-transparent hover:bg-[var(--color-bg-muted)]/40 ${
                  sectionHasCurrentPage
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-tertiary)]'
                }`}
              >
                {section.label}
                <motion.span animate={{ rotate: open[section.id] ? 0 : -90 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={14} className="text-[var(--color-text-tertiary)] opacity-80" />
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
                            className={`block rounded-md px-2.5 py-1.5 text-[14px] leading-snug transition-colors outline-none focus-visible:ring-0 ring-0 shadow-none active:opacity-90 ${
                              active
                                ? 'bg-[var(--color-text)] text-[var(--color-bg)] font-medium'
                                : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]/50 hover:text-[var(--color-text-secondary)]'
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
