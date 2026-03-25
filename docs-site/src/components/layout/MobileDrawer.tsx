import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { NAV_SECTIONS } from '@/config/navigation';
import { useMainScrollRef } from '@/context/MainScrollContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileDrawer({ open, onClose }: Props) {
  const mainScrollRef = useMainScrollRef();
  const loc = useLocation();
  const pathSlug = loc.pathname.replace(/^\/docs\/?/, '') || 'overview';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[80] bg-black/20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close menu"
          />
          <motion.aside
            className="fixed left-0 top-0 z-[90] h-full w-[min(300px,88vw)] bg-[var(--color-bg)] border-r border-[var(--color-border)] shadow-lg lg:hidden overflow-y-auto scrollbar-thin"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text)]">Documentation</span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="p-3 space-y-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.id}>
                  <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide px-2 mb-2">
                    {section.label}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathSlug === item.slug;
                      return (
                        <li key={item.slug}>
                          <Link
                            to={`/docs/${item.slug}`}
                            onClick={() => {
                              onClose();
                              const reset = () => {
                                const el = mainScrollRef.current;
                                if (el) el.scrollTop = 0;
                              };
                              reset();
                              requestAnimationFrame(reset);
                            }}
                            className={`block rounded-md px-3 py-2 text-[14px] ${
                              active
                                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text)] font-medium'
                                : 'text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
