import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <div className="mx-auto max-w-[1800px] px-4 lg:px-6 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[13px] text-[var(--color-text-secondary)]">
        <p>© Phanes — AEOS technical documentation</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/docs/overview" className="hover:text-[var(--color-link)]">
            Overview
          </Link>
          <Link to="/docs/integration/rest-api" className="hover:text-[var(--color-link)]">
            REST API
          </Link>
          <a href="https://phanes.app" className="hover:text-[var(--color-link)]" target="_blank" rel="noreferrer">
            Product site
          </a>
        </div>
      </div>
    </footer>
  );
}
