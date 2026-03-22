'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Category, Box, Profile, LogoutCurve } from 'iconsax-react';

const NAV_TABS = [
  { href: '/customer/dashboard', Icon: Category, label: 'Dashboard' },
  { href: '/customer/orders', Icon: Box, label: 'Orders' },
  { href: '/customer/account', Icon: Profile, label: 'Account' },
];

const AUTH_PATHS = ['/customer', '/customer/signup', '/customer/verify', '/signup'];

function CustomerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      router.replace('/');
      return;
    }
    try {
      const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
      setCustomerInfo(info);
    } catch {
      setCustomerInfo({});
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    router.replace('/');
  }

  return (
    <div className="h-screen bg-[#000000] text-[#f0f0f0] flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#070707] border-r border-[rgba(255,255,255,0.08)] h-screen flex-shrink-0">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
          <Logo size="default" />
          <p className="text-[#a1a4a5] text-xs mt-1 tracking-widest uppercase">Customer</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
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
          {customerInfo?.name && (
            <p className="text-[#a1a4a5] text-xs px-3 mb-2 truncate">{customerInfo.name}</p>
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
              {NAV_TABS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'))?.label ?? 'Customer Portal'}
            </p>
            {customerInfo?.email && (
              <p className="text-[#a1a4a5] text-xs">{customerInfo.email}</p>
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
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070707] border-t border-[rgba(255,255,255,0.08)] flex">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const NavIcon = tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 py-3 relative
                transition-colors duration-150
                ${isActive ? 'text-[#f0f0f0]' : 'text-[#a1a4a5]'}
              `}
            >
              <NavIcon size={22} color="currentColor" />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#f0f0f0]' : 'text-[#a1a4a5]'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-[rgba(255,255,255,0.4)] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth pages render without the shell
  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return <CustomerShell>{children}</CustomerShell>;
}
