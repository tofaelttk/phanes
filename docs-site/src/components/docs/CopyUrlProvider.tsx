import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Ctx = (headingId: string) => void;

const CopyUrlContext = createContext<Ctx | null>(null);

export function CopyUrlProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const copySectionUrl = useCallback((headingId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${headingId}`;
    void navigator.clipboard.writeText(url);
    window.history.replaceState(null, '', `#${headingId}`);
    const el = document.getElementById(headingId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = setTimeout(() => setToast(false), 2600);
  }, []);

  return (
    <CopyUrlContext.Provider value={copySectionUrl}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-[100] max-w-[min(calc(100vw-2rem),20rem)] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[13px] text-[var(--color-text-secondary)] shadow-lg transition-[opacity,transform] duration-200 ${
          toast ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-1'
        }`}
      >
        URL copied to your clipboard
      </div>
    </CopyUrlContext.Provider>
  );
}

export function useCopySectionUrl(): Ctx {
  const c = useContext(CopyUrlContext);
  if (!c) throw new Error('useCopySectionUrl outside CopyUrlProvider');
  return c;
}
