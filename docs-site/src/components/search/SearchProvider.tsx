import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import Fuse from 'fuse.js';
import { buildSearchCorpus, createFuseIndex, type SearchDoc } from '@/lib/searchIndex';
import { CommandPalette } from './CommandPalette';

type Ctx = {
  fuse: Fuse<SearchDoc>;
  docs: SearchDoc[];
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
};

const SearchContext = createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { fuse, docs } = useMemo(() => {
    const d = buildSearchCorpus();
    return { fuse: createFuseIndex(d), docs: d };
  }, []);

  const value = useMemo(
    () => ({ fuse, docs, searchOpen, setSearchOpen }),
    [fuse, docs, searchOpen]
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </SearchContext.Provider>
  );
}

/** Search index + palette state (hook lives next to provider intentionally). */
// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch outside SearchProvider');
  return ctx;
}
