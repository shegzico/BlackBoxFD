'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Category, Box, Routing2, People, DollarCircle, Wallet2, LogoutCurve } from 'iconsax-react';

const NAV_TABS = [
  { href: '/bb-admin/dashboard', Icon: Category, label: 'Dashboard' },
  { href: '/bb-admin/orders', Icon: Box, label: 'Orders' },
  { href: '/bb-admin/riders', Icon: Routing2, label: 'Riders' },
  { href: '/bb-admin/customers', Icon: People, label: 'Customers' },
  { href: '/bb-admin/pricing', Icon: DollarCircle, label: 'Pricing' },
  { href: '/bb-admin/finances', Icon: Wallet2, label: 'Finances' },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminInfo, setAdminInfo] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/bb-admin');
      return;
    }
    try {
      const info = JSON.parse(localStorage.getItem('admin_info') || '{}');
      setAdminInfo(info);
    } catch {
      setAdminInfo({});
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    router.replace('/bb-admin');
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#070707] border-r border-[rgba(255,255,255,0.08)] min-h-screen sticky top-0">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
          <Logo size="default" />
          <p className="text-[#a1a4a5] text-xs mt-1 tracking-widest uppercase">Admin</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const NavIcon = tab.Icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-[#18191ce0] text-[#f0f0f0]'
                    : 'text-[#a1a4a5] hover:text-[#f0f0f0] hover:bg-[#161616]'
                  }
                `}
              >
                <NavIcon size={18} color="currentColor" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.08)]">
          {adminInfo?.name && (
            <p className="text-[#a1a4a5] text-xs px-3 mb-2 truncate">{adminInfo.name}</p>
          )}
          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              text-[#a85858] hover:bg-[rgba(135,55,55,0.12)] hover:text-red-300
              transition-colors duration-150
            "
          >
            <LogoutCurve size={18} color="currentColor" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#070707] border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-40">
          <Logo size="default" />
          <button
            onClick={handleLogout}
            className="text-[#a1a4a5] hover:text-[#a85858] transition-colors text-sm px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]"
          >
            Logout
          </button>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#070707] border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-40">
          <div>
            <p className="text-[#f0f0f0] font-semibold text-sm">
              {NAV_TABS.find((t) => t.href === pathname)?.label ?? 'Admin Portal'}
            </p>
            {adminInfo?.email && (
              <p className="text-[#a1a4a5] text-xs">{adminInfo.email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[#a1a4a5] hover:text-[#a85858] transition-colors text-sm px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]"
          >
            <LogoutCurve size={18} color="currentColor" /> Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070707] border-t border-[rgba(255,255,255,0.08)] flex">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const NavIcon = tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 py-3
                transition-colors duration-150
                ${isActive ? 'text-[#f0f0f0]' : 'text-[#a1a4a5]'}
              `}
            >
              <NavIcon size={22} color="currentColor" />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#f0f0f0]' : 'text-[#a1a4a5]'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-[rgba(255,255,255,0.4)] rounded-full" style={{ bottom: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page at /admin exactly — no shell wrapping
  if (pathname === '/bb-admin') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
