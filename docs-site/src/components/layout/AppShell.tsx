import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DocHeader } from './DocHeader';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { MobileDrawer } from './MobileDrawer';
import { MainScrollProvider, useMainScrollRef } from '@/context/MainScrollContext';

function AppShellInner() {
  const [mobileNav, setMobileNav] = useState(false);
  const mainScrollRef = useMainScrollRef();

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--color-bg)]">
      <MobileDrawer open={mobileNav} onClose={() => setMobileNav(false)} />
      <DocHeader onOpenMobileNav={() => setMobileNav(true)} />
      <div className="flex min-h-0 flex-1 w-full max-w-[1920px] mx-auto">
        <Sidebar />
        <div
          ref={mainScrollRef}
          id="docs-main-scroll"
          className="docs-main-scroll flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-y-contain scroll-smooth"
        >
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function AppShell() {
  return (
    <MainScrollProvider>
      <AppShellInner />
    </MainScrollProvider>
  );
}
