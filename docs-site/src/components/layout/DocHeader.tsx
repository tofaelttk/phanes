import { Link, useParams } from 'react-router-dom';
import { BookOpen, Copy, Menu, Moon, Search, Sun } from 'lucide-react';
import { useSearch } from '@/components/search/SearchProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { getDocBreadcrumb } from '@/lib/breadcrumb';

type Props = {
  onOpenMobileNav: () => void;
};

export function DocHeader({ onOpenMobileNav }: Props) {
  const { '*': splat } = useParams();
  const slug = splat && splat.length > 0 ? splat : 'overview';
  const bc = getDocBreadcrumb(slug);
  const { setSearchOpen } = useSearch();
  const { theme, toggle } = useTheme();

  const copyPage = () => {
    void navigator.clipboard.writeText(window.location.href);
  };

  const actions = (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      <button
        type="button"
        onClick={copyPage}
        className="p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]/40"
        title="Copy page link"
        aria-label="Copy page link"
      >
        <Copy size={17} />
      </button>
      <button
        type="button"
        onClick={toggle}
        className="p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]/40"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );

  return (
    <header className="shrink-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
      <div className="flex flex-col lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-stretch min-w-0">
        <div className="flex h-14 shrink-0 items-center gap-2 px-3 lg:border-r border-[var(--color-border)] min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 -ml-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]/40"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <Link
            to="/docs/overview"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden hover:opacity-90"
            title="Documentation home"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
              <BookOpen size={17} strokeWidth={2} />
            </span>
            <span className="hidden min-w-0 sm:inline-flex flex-row items-baseline gap-1.5 leading-tight">
              <span className="font-semibold text-[15px] text-[var(--color-text)] tracking-tight truncate">Phanes</span>
              <span className="text-[13px] font-medium text-[var(--color-text-tertiary)] shrink-0">Developers</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto shrink-0 p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]/80 hover:text-[var(--color-text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]/40"
            aria-label="Search"
            title="Search (⌘K)"
          >
            <Search size={14} strokeWidth={2} />
          </button>
          <div className="flex shrink-0 lg:hidden">{actions}</div>
        </div>

        <div className="flex min-h-[3.25rem] flex-1 flex-col justify-center gap-2 border-t border-[var(--color-border)] px-3 py-2 sm:px-4 lg:min-h-14 lg:flex-row lg:items-center lg:justify-between lg:border-t-0 lg:py-0 min-w-0">
          <div className="flex min-w-0 flex-1 items-center pr-2 lg:pr-4">
            {bc ? (
              <nav
                className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[14px] leading-snug text-[var(--color-text-tertiary)]"
                aria-label="Breadcrumb"
              >
                <span className="truncate shrink-0 font-medium">{bc.section}</span>
                <span className="text-[var(--color-border-strong)] shrink-0 select-none opacity-70" aria-hidden>
                  /
                </span>
                <span className="truncate font-medium min-w-0 opacity-90">{bc.page}</span>
              </nav>
            ) : (
              <span className="text-[14px] text-[var(--color-text-tertiary)] truncate">Docs</span>
            )}
          </div>
          <div className="hidden lg:flex shrink-0">{actions}</div>
        </div>
      </div>
    </header>
  );
}
