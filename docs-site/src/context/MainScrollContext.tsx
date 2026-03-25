import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';

const MainScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function MainScrollProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return <MainScrollContext.Provider value={ref}>{children}</MainScrollContext.Provider>;
}

export function useMainScrollRef(): RefObject<HTMLDivElement | null> {
  const ctx = useContext(MainScrollContext);
  if (!ctx) throw new Error('useMainScrollRef must be used within MainScrollProvider');
  return ctx;
}
