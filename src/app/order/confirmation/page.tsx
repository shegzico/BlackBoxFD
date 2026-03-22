'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://blackboxfd.com');

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const trackingId = searchParams.get('id') ?? '';
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = trackingId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const whatsappText = encodeURIComponent(
    `Track your BlackBox delivery: ${APP_URL}/track/${trackingId}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <main className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center gap-8">
      {/* Success Icon */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-[#F2FF66]/10 border-2 border-[#F2FF66] flex items-center justify-center">
          <svg
            className="w-10 h-10 text-[#F2FF66]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Order Confirmed!</h1>
          <p className="text-gray-400 text-sm mt-1">
            Your package has been booked for dispatch.
          </p>
        </div>
      </div>

      {/* Tracking ID Card */}
      <div className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col items-center gap-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest font-medium">
          Tracking ID
        </p>
        <p className="text-[#f0f0f0] font-bold text-3xl tracking-widest font-mono break-all text-center">
          {trackingId}
        </p>
        <button
          onClick={handleCopy}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-[#161616] hover:bg-gray-700
            text-sm text-[#f0f0f0] font-medium
            transition-all duration-150 active:scale-95
          "
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-[#a1a4a5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy ID
            </>
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3">
        {/* WhatsApp Share */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            w-full flex items-center justify-center gap-2
            py-4 rounded-xl font-semibold text-base
            bg-[#25D366] text-white
            hover:bg-[#1ebe59] active:scale-[0.98]
            transition-all duration-150
          "
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share on WhatsApp
        </a>

        {/* Track Order */}
        <Link
          href={`/track/${trackingId}`}
          className="
            w-full flex items-center justify-center
            py-4 rounded-xl font-semibold text-base
            bg-[#F2FF66] text-[#000000]
            hover:bg-[#e8f550] active:scale-[0.98]
            transition-all duration-150
          "
        >
          Track Your Order
        </Link>

        {/* Place Another */}
        <Link
          href="/order"
          className="
            w-full flex items-center justify-center
            py-4 rounded-xl font-semibold text-base
            bg-[#070707] text-[#f0f0f0] border border-[rgba(255,255,255,0.06)]
            hover:border-gray-500 active:scale-[0.98]
            transition-all duration-150
          "
        >
          Place Another Order
        </Link>
      </div>
    </main>
  );
}

function ConfirmationFallback() {
  return (
    <main className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center gap-8">
      <div className="w-20 h-20 rounded-full bg-[#161616] animate-pulse" />
      <div className="w-48 h-8 rounded-lg bg-[#161616] animate-pulse" />
      <div className="w-full h-40 rounded-xl bg-[#161616] animate-pulse" />
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0]">
      <Navbar showBack backHref="/" title="Order Confirmed" />
      <Suspense fallback={<ConfirmationFallback />}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
