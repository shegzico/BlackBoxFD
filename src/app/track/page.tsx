'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { SearchNormal1 } from 'iconsax-react';

export default function TrackPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    // Allow letters, digits and hyphens (hyphens for legacy BB-XXXXXX format)
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
    // Accept new format (BB + 8 chars) or legacy format (BB-XXXXXX)
    if (!/^BB[A-Z0-9]{8}$/.test(trimmed) && !/^BB-[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Invalid tracking ID format.');
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
              <SearchNormal1 size={28} color="#F2FF66" />
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
                placeholder="Enter tracking ID (e.g., BB1A2B3C4D)"
                maxLength={10}
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
            Your tracking ID was sent via SMS or email when your order was placed. It starts with <span className="font-mono">BB</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
