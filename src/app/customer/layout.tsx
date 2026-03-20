'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const NAV_TABS = [
  { href: '/customer/dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
  { href: '/customer/orders', icon: '\u{1F4E6}', label: 'Orders' },
  { href: '/customer/account', icon: '\u{1F464}', label: 'Account' },
];

const AUTH_PATHS = ['/customer', '/customer/signup', '/customer/verify'];

function CustomerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      router.replace('/customer');
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
    router.replace('/customer');
  }

  return (
    <div className="h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#191314] border-r border-[#2A2A2A] h-screen flex-shrink-0">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-[#2A2A2A]">
          <Logo size="default" />
          <p className="text-[#888888] text-xs mt-1 tracking-widest uppercase">Customer</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-[#F2FF66]/10 text-[#F2FF66] border border-[#F2FF66]/20'
                    : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#1E1E1E]'
                  }
                `}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-[#2A2A2A]">
          {customerInfo?.name && (
            <p className="text-[#888888] text-xs px-3 mb-2 truncate">{customerInfo.name}</p>
          )}
          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              text-red-400 hover:bg-red-500/10 hover:text-red-300
              transition-colors duration-150
            "
          >
            <span>{'\u{1F6AA}'}</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#191314] border-b border-[#2A2A2A] sticky top-0 z-40">
          <Logo size="default" />
          <button
            onClick={handleLogout}
            className="text-[#888888] hover:text-red-400 transition-colors text-sm px-3 py-1.5 rounded-lg border border-[#2A2A2A]"
          >
            Logout
          </button>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#191314] border-b border-[#2A2A2A] sticky top-0 z-40">
          <div>
            <p className="text-[#FAFAFA] font-semibold text-sm">
              {NAV_TABS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'))?.label ?? 'Customer Portal'}
            </p>
            {customerInfo?.email && (
              <p className="text-[#888888] text-xs">{customerInfo.email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-[#888888] hover:text-red-400 transition-colors text-sm px-3 py-1.5 rounded-lg border border-[#2A2A2A]"
          >
            {'\u{1F6AA}'} Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#191314] border-t border-[#2A2A2A] flex">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 py-3 relative
                transition-colors duration-150
                ${isActive ? 'text-[#F2FF66]' : 'text-[#888888]'}
              `}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#F2FF66]' : 'text-[#888888]'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-[#F2FF66] rounded-full" />
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
