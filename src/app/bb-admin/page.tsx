'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        router.replace('/bb-admin/dashboard');
      }
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_info', JSON.stringify(data.admin));
      router.replace('/bb-admin/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col">
      <Navbar showBack backHref="/" title="Admin Login" />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="large" />
          <p className="text-[#888888] text-sm tracking-widest uppercase">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-[#191314] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-[#FAFAFA] mb-1">Sign In</h1>
          <p className="text-[#888888] text-sm mb-6">Access the BlackBox admin dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[#888888] text-xs font-medium uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@blackbox.com"
                required
                autoComplete="email"
                className="
                  w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg
                  px-4 py-3 text-[#FAFAFA] text-sm
                  placeholder:text-[#888888]
                  focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66]/30
                  transition-colors
                "
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[#888888] text-xs font-medium uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="
                  w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg
                  px-4 py-3 text-[#FAFAFA] text-sm
                  placeholder:text-[#888888]
                  focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66]/30
                  transition-colors
                "
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                mt-2 w-full bg-[#F2FF66] text-[#0A0A0A] font-bold
                py-3 rounded-lg text-sm
                hover:bg-[#e8f55c] active:scale-95
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-[#888888] text-xs text-center">
          BlackBox Logistics &mdash; Admin Access Only
        </p>
      </main>
    </div>
  );
}
