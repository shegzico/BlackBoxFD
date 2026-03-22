'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { Refresh2 } from 'iconsax-react';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Start cooldown on mount (code was just sent)
  useEffect(() => {
    startCooldown();
  }, [startCooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_info', JSON.stringify(data.customer));
      router.replace('/customer/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/customer/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code. Please try again.');
        setResendLoading(false);
        return;
      }

      startCooldown();
      setResendLoading(false);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="large" />
          <p className="text-[#a1a4a5] text-sm tracking-widest uppercase">Customer Portal</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-[#f0f0f0] mb-1">Verify Your Email</h1>
          <p className="text-[#a1a4a5] text-sm mb-6">
            We sent a verification code to{' '}
            <span className="text-[#f0f0f0] font-medium">{email}</span>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setOtp(val);
                }}
                placeholder="000000"
                required
                disabled={loading}
                autoComplete="one-time-code"
                className="
                  w-full bg-[#232023] border border-[rgba(255,255,255,0.06)] rounded-lg
                  px-3 py-4 text-[#f0f0f0] text-2xl text-center font-mono
                  placeholder-gray-600 tracking-[0.5em]
                  focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[#212629]
                  transition-colors disabled:opacity-50
                "
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="
                mt-2 w-full bg-[#F2FF66] text-[#000000] font-bold
                py-3 rounded-lg text-sm
                hover:bg-[#e8f55c] active:scale-95
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <Refresh2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="text-sm disabled:text-[#a1a4a5] text-[#F2FF66] hover:underline font-medium disabled:no-underline disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Resend code'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CustomerVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#000000] flex items-center justify-center">
          <Refresh2 size={24} color="#F2FF66" className="animate-spin" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
