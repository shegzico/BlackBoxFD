'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function TrackPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    // Allow only letters, digits and hyphens; enforce BB-XXXXXX format loosely
    const cleaned = raw.replace(/[^A-Z0-9-]/g, '');
    setTrackingId(cleaned);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingId.trim();
    if (!trimmed) {
      setError('Please enter a tracking ID.');
      return;
    }
    // Basic format check: BB-XXXXXX (letters/digits after dash)
    if (!/^BB-[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Invalid format. Use BB-XXXXXX (e.g., BB-A3K9X2).');
      return;
    }
    router.push(`/track/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <Navbar showBack backHref="/" title="Track Package" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F2FF66]/10 mb-4">
              <svg
                className="w-7 h-7 text-[#F2FF66]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#f0f0f0] mb-1">Track your package</h1>
            <p className="text-sm text-gray-400">
              Enter your tracking ID to see real-time delivery status.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="tracking-id" className="sr-only">
                Tracking ID
              </label>
              <input
                id="tracking-id"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                value={trackingId}
                onChange={handleChange}
                placeholder="Enter tracking ID (e.g., BB-A3K9X2)"
                maxLength={9}
                className={`w-full bg-[#070707] border rounded-xl px-4 py-3.5 text-[#f0f0f0] text-base placeholder-gray-600 font-mono tracking-wider outline-none transition-colors
                  ${error ? 'border-red-500 focus:border-red-400' : 'border-[rgba(255,255,255,0.08)] focus:border-[#212629]'}`}
              />
              {error && (
                <p className="mt-2 text-xs text-[#a85858]">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#F2FF66] text-black font-bold text-base py-3.5 rounded-xl hover:bg-[#e8f55c] active:scale-[0.98] transition-all duration-150"
            >
              Track Package
            </button>
          </form>

          {/* Helper hint */}
          <p className="mt-6 text-center text-xs text-gray-600">
            Your tracking ID was sent via SMS or email when your order was placed.
          </p>
        </div>
      </main>
    </div>
  );
}
