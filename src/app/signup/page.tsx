'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { isValidNigerianPhone } from '@/lib/types';

type AccountType = 'individual' | 'business';
type Step = 0 | 1 | 2;

const BUSINESS_TYPES = [
  'Retail',
  'E-commerce',
  'Fashion',
  'Food & Beverage',
  'Pharmacy/Health',
  'Logistics',
  'Technology',
  'Other',
];

const inputClassName =
  'w-full rounded-lg bg-[#232023] border border-[rgba(255,255,255,0.06)] text-[#f0f0f0] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[#212629] transition-colors disabled:opacity-50';

function PersonIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke={selected ? '#F2FF66' : '#a1a4a5'}
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function BuildingIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke={selected ? '#F2FF66' : '#a1a4a5'}
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}

function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors text-sm mb-4"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      Back
    </button>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full flex-1 transition-colors ${
            i < current ? 'bg-[#F2FF66]' : i === current ? 'bg-[#F2FF66]/60' : 'bg-[rgba(255,255,255,0.08)]'
          }`}
        />
      ))}
      <span className="text-xs text-[#a1a4a5] whitespace-nowrap ml-1">
        Step {current + 1} of {total}
      </span>
    </div>
  );
}

export default function CustomerSignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(0);
  const [accountType, setAccountType] = useState<AccountType>('individual');

  // Personal fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Business fields
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessType, setBusinessType] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleAccountTypeSelect(type: AccountType) {
    setAccountType(type);
    setStep(1);
    setError('');
  }

  function validatePersonal(): string {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!isValidNigerianPhone(phone)) return 'Please enter a valid Nigerian phone number.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }

  function handlePersonalContinue(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePersonal();
    if (err) { setError(err); return; }
    setError('');

    if (accountType === 'individual') {
      handleSubmit();
    } else {
      setStep(2);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const payload: Record<string, string> = {
        name: fullName,
        email,
        phone,
        password,
        account_type: accountType,
      };

      if (accountType === 'business') {
        if (!businessName.trim()) { setError('Business name is required.'); setLoading(false); return; }
        if (!businessAddress.trim()) { setError('Business address is required.'); setLoading(false); return; }
        payload.business_name = businessName;
        if (businessEmail) payload.business_email = businessEmail;
        if (businessPhone) payload.business_phone = businessPhone;
        payload.business_address = businessAddress;
        if (businessType) payload.business_type = businessType;
      }

      const res = await fetch('/api/auth/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      router.push(`/customer/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  function handleBusinessSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSubmit();
  }

  // ===== Step 0: Account type selection =====
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="mb-8 flex flex-col items-center gap-2">
            <Logo size="large" />
            <p className="text-[#a1a4a5] text-sm tracking-widest uppercase">Customer Portal</p>
          </div>

          <div className="w-full max-w-sm">
            <h1 className="text-xl font-bold text-[#f0f0f0] mb-1 text-center">Create Account</h1>
            <p className="text-[#a1a4a5] text-sm mb-8 text-center">How will you use BlackBox?</p>

            <div className="flex gap-3">
              {/* Individual Card */}
              <button
                onClick={() => handleAccountTypeSelect('individual')}
                className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 bg-[#070707] transition-all duration-200 hover:border-[#212629]/60 ${
                  accountType === 'individual'
                    ? 'border-[#F2FF66]'
                    : 'border-[rgba(255,255,255,0.08)]'
                }`}
              >
                <PersonIcon selected={accountType === 'individual'} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#f0f0f0]">Individual</p>
                  <p className="text-xs text-[#a1a4a5] mt-0.5">For personal deliveries</p>
                </div>
              </button>

              {/* Business Card */}
              <button
                onClick={() => handleAccountTypeSelect('business')}
                className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 bg-[#070707] transition-all duration-200 hover:border-[#212629]/60 ${
                  accountType === 'business'
                    ? 'border-[#F2FF66]'
                    : 'border-[rgba(255,255,255,0.08)]'
                }`}
              >
                <BuildingIcon selected={accountType === 'business'} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#f0f0f0]">Business</p>
                  <p className="text-xs text-[#a1a4a5] mt-0.5">For companies & teams</p>
                </div>
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[#a1a4a5] text-sm">
                Already have an account?{' '}
                <Link href="/" className="text-[#F2FF66] hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ===== Step 1: Personal details =====
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="mb-8 flex flex-col items-center gap-2">
            <Logo size="large" />
          </div>

          <div className="w-full max-w-sm bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xl">
            <BackArrow onClick={() => { setStep(0); setError(''); }} />

            {accountType === 'business' && <StepIndicator current={0} total={2} />}

            <h1 className="text-xl font-bold text-[#f0f0f0] mb-1">
              {accountType === 'business' ? 'Your Details' : 'Create Account'}
            </h1>
            <p className="text-[#a1a4a5] text-sm mb-6">
              {accountType === 'business'
                ? 'Personal info for your admin account'
                : 'Sign up to start shipping with BlackBox'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handlePersonalContinue} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  autoComplete="name"
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  id="phone"
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
                <label htmlFor="password" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
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
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating Account...
                  </>
                ) : accountType === 'business' ? (
                  'Continue →'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-[#a1a4a5] text-sm">
                Already have an account?{' '}
                <Link href="/" className="text-[#F2FF66] hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ===== Step 2: Business details (business only) =====
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="large" />
        </div>

        <div className="w-full max-w-sm bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xl">
          <BackArrow onClick={() => { setStep(1); setError(''); }} />

          <StepIndicator current={1} total={2} />

          <h1 className="text-xl font-bold text-[#f0f0f0] mb-0.5">
            Hi {fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-[#a1a4a5] text-sm mb-6">Fill in your business details</p>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleBusinessSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Business Name <span className="text-[#a85858]">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Corp"
                required
                disabled={loading}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Business Email <span className="text-[#555]">(optional)</span>
              </label>
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="info@company.com"
                disabled={loading}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Business Phone <span className="text-[#555]">(optional)</span>
              </label>
              <input
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="08012345678"
                disabled={loading}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Business Address <span className="text-[#a85858]">*</span>
              </label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="12 Admiralty Way, Lekki, Lagos"
                required
                disabled={loading}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={loading}
                className={inputClassName}
              >
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#F2FF66] text-[#000000] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating Business Account...
                </>
              ) : (
                'Create Business Account'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
