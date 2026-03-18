'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const NAV_TABS = [
  { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/orders', icon: '📦', label: 'Orders' },
  { href: '/admin/riders', icon: '🏍️', label: 'Riders' },
  { href: '/admin/finances', icon: '💰', label: 'Finances' },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminInfo, setAdminInfo] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin');
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
    router.replace('/admin');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#191314] border-r border-[#2A2A2A] min-h-screen sticky top-0">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-[#2A2A2A]">
          <Logo size="default" />
          <p className="text-[#888888] text-xs mt-1 tracking-widest uppercase">Admin</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href;
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
          {adminInfo?.name && (
            <p className="text-[#888888] text-xs px-3 mb-2 truncate">{adminInfo.name}</p>
          )}
          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              text-red-400 hover:bg-red-500/10 hover:text-red-300
              transition-colors duration-150
            "
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
              {NAV_TABS.find((t) => t.href === pathname)?.label ?? 'Admin Portal'}
            </p>
            {adminInfo?.email && (
              <p className="text-[#888888] text-xs">{adminInfo.email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-[#888888] hover:text-red-400 transition-colors text-sm px-3 py-1.5 rounded-lg border border-[#2A2A2A]"
          >
            🚪 Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#191314] border-t border-[#2A2A2A] flex">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 py-3
                transition-colors duration-150
                ${isActive ? 'text-[#F2FF66]' : 'text-[#888888]'}
              `}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#F2FF66]' : 'text-[#888888]'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-[#F2FF66] rounded-full" style={{ bottom: 0 }} />
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
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
