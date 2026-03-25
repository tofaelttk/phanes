import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, BookOpen, Layers } from 'lucide-react';
import { useSearch } from './SearchProvider';
import { flattenNav } from '@/config/navigation';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const [q, setQ] = useState('');
  const { fuse } = useSearch();
  const navigate = useNavigate();

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setQ('');
      onOpenChange(v);
    },
    [onOpenChange]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        handleOpenChange(false);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [open, handleOpenChange]);

  const results = q.trim() ? fuse.search(q, { limit: 14 }).map((r) => r.item) : [];

  const run = (slug: string) => {
    setQ('');
    onOpenChange(false);
    navigate(`/docs/${slug}`);
  };

  const itemCls =
    'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-text-secondary)] aria-selected:bg-[var(--color-bg-muted)] aria-selected:text-[var(--color-text)]';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close search"
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleOpenChange(false)}
          />
          <motion.div
            className="fixed left-1/2 top-[min(18vh,100px)] z-[101] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2"
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Command
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 bg-[var(--color-bg-subtle)]">
                <Search size={16} className="text-[var(--color-text-tertiary)] shrink-0" />
                <Command.Input
                  placeholder="Search documentation…"
                  value={q}
                  onValueChange={setQ}
                  autoFocus
                  className="flex-1 bg-transparent border-0 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)]"
                />
                <kbd className="hidden sm:inline text-[10px] text-[var(--color-text-tertiary)] font-mono px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
                  esc
                </kbd>
              </div>
              <Command.List className="max-h-[min(400px,48vh)] overflow-y-auto p-2 scrollbar-thin">
                {!q.trim() && (
                  <>
                    <Command.Group
                      heading="Jump to"
                      className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide px-2 py-2"
                    >
                      {flattenNav()
                        .slice(0, 8)
                        .map((item) => (
                          <Command.Item key={item.slug} value={item.slug} onSelect={() => run(item.slug)} className={itemCls}>
                            <FileText size={14} className="text-[var(--color-accent)] shrink-0" />
                            <span>{item.title}</span>
                          </Command.Item>
                        ))}
                    </Command.Group>
                    <Command.Group
                      heading="Shortcuts"
                      className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide px-2 py-2"
                    >
                      <Command.Item onSelect={() => run('protocol/module-matrix')} className={itemCls}>
                        <Layers size={14} className="text-[var(--color-accent)] shrink-0" />
                        Module matrix
                      </Command.Item>
                      <Command.Item onSelect={() => run('integration/rest-api')} className={itemCls}>
                        <BookOpen size={14} className="text-[var(--color-accent)] shrink-0" />
                        REST API reference
                      </Command.Item>
                    </Command.Group>
                  </>
                )}
                {q.trim() && results.length === 0 && (
                  <Command.Empty className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">No matches</Command.Empty>
                )}
                {results.length > 0 && (
                  <Command.Group
                    heading="Results"
                    className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide px-2 py-2"
                  >
                    {results.map((d) => (
                      <Command.Item key={d.slug} value={d.slug} onSelect={() => run(d.slug)} className={itemCls}>
                        <FileText size={14} className="text-[var(--color-accent)] shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium text-[var(--color-text)]">{d.title}</span>
                          <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">{d.section}</span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
