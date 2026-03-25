import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DocHeader } from './DocHeader';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { MobileDrawer } from './MobileDrawer';

export function AppShell() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <MobileDrawer open={mobileNav} onClose={() => setMobileNav(false)} />
      <DocHeader onOpenMobileNav={() => setMobileNav(true)} />
      <div className="flex flex-1 w-full max-w-[1920px] mx-auto min-w-0">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
