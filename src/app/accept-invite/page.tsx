'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { isValidNigerianPhone } from '@/lib/types';
import { Refresh2, Danger } from 'iconsax-react';

interface InviteDetails {
  valid: boolean;
  email?: string;
  role?: string;
  business?: { name: string };
}

const inputClassName =
  'w-full rounded-lg bg-[#232023] border border-[rgba(255,255,255,0.06)] text-[#f0f0f0] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[#212629] transition-colors disabled:opacity-50';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [checking, setChecking] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvite({ valid: false });
      setChecking(false);
      return;
    }

    async function checkInvite() {
      try {
        const res = await fetch(`/api/business/invite/${token}`);
        const data = await res.json();
        setInvite(data);
      } catch {
        setInvite({ valid: false });
      } finally {
        setChecking(false);
      }
    }

    checkInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!isValidNigerianPhone(phone)) { setError('Please enter a valid Nigerian phone number.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept invite. Please try again.');
        setLoading(false);
        return;
      }

      // Store auth data
      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_info', JSON.stringify(data.customer));

      router.replace('/customer/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Refresh2 size={32} color="#F2FF66" className="animate-spin" />
          <p className="text-[#a1a4a5] text-sm">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (!invite?.valid) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col items-center justify-center px-4">
        <Logo size="large" />
        <div className="mt-8 w-full max-w-sm bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(135,55,55,0.12)] border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Danger size={32} color="#a85858" />
          </div>
          <h1 className="text-xl font-bold text-[#f0f0f0] mb-2">Invalid Invite</h1>
          <p className="text-[#a1a4a5] text-sm leading-relaxed">
            This invite link is invalid or has expired. Please ask your team admin to send a new invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size="large" />
        </div>

        <div className="w-full max-w-sm bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xl">
          {/* Invite header */}
          <div className="mb-6 p-4 bg-[#F2FF66]/5 border border-[#F2FF66]/20 rounded-xl">
            <p className="text-xs text-[#a1a4a5] uppercase tracking-wider mb-1">You&apos;ve been invited to</p>
            <p className="text-base font-bold text-[#F2FF66]">{invite.business?.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2FF66]/10 text-[#F2FF66] font-medium capitalize">
                {invite.role}
              </span>
              <span className="text-xs text-[#a1a4a5]">role</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-[#f0f0f0] mb-1">Join the team</h1>
          <p className="text-[#a1a4a5] text-sm mb-6">Create your account to accept this invitation</p>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email — read-only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={invite.email || ''}
                readOnly
                className={`${inputClassName} opacity-60 cursor-not-allowed`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={loading}
                autoComplete="name"
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                required
                disabled={loading}
                autoComplete="tel"
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                disabled={loading}
                autoComplete="new-password"
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="new-password"
                className={inputClassName}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#F2FF66] text-[#000000] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Refresh2 size={16} className="animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invitation'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Refresh2 size={32} color="#F2FF66" className="animate-spin" />
            <p className="text-[#a1a4a5] text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
