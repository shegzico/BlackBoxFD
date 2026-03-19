'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import Timeline from '@/components/Timeline';
import { Delivery, DeliveryHistory, PAYMENT_LABELS } from '@/lib/types';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface DeliveryWithHistory extends Delivery {
  history: DeliveryHistory[];
}

// ────────────────────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#191314] ${className ?? ''}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 px-4 py-6 max-w-lg mx-auto">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Info card
// ────────────────────────────────────────────────────────────
function InfoCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#191314] rounded-xl p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F2FF66]/10 flex items-center justify-center text-[#F2FF66]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-[#FAFAFA] truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Icons (inline SVG to avoid extra deps)
// ────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 0 1-2.828 0L6.343 16.657a8 8 0 1 1 11.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
  </svg>
);

const BikeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 6h-3l-2 5.5 3 2.5 2-3h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 17.5L9 11l3 3" />
  </svg>
);

const BoxIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11" />
  </svg>
);

const CardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m6.632 8.342a3 3 0 1 0 0-5.016M15.316 5.658a3 3 0 1 0-6.632 2.684m6.632-2.684l-6.632 2.684" />
  </svg>
);

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [delivery, setDelivery] = useState<DeliveryWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch delivery on mount
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    async function fetchDelivery() {
      try {
        const res = await fetch(`/api/deliveries/${id}`, { signal: controller.signal });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setDelivery(data.delivery);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setNotFound(true);
        }
        // If aborted (React Strict Mode double-invoke), don't flip loading off —
        // the second effect invocation will do a fresh fetch and manage state itself.
        if ((err as Error).name === 'AbortError') return;
      } finally {
        // Only update loading state if the request wasn't aborted mid-flight.
        // Checking the signal here avoids a flash of "not found" in Strict Mode.
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDelivery();
    return () => controller.abort();
  }, [id]);

  // Confirm receipt handler
  const handleConfirmReceipt = async () => {
    if (!delivery || confirming) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', triggered_by: 'recipient' }),
      });
      if (!res.ok) throw new Error('Failed to confirm');
      const data = await res.json();
      // Merge updated delivery with existing history, then re-fetch history by refetching full delivery
      const refreshed = await fetch(`/api/deliveries/${id}`);
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        setDelivery(refreshedData.delivery);
      } else {
        setDelivery((prev) => prev ? { ...prev, ...data.delivery } : data.delivery);
      }
      setConfirmed(true);
    } catch {
      // silently fail; user can retry
    } finally {
      setConfirming(false);
    }
  };

  // Share / copy link handler
  const handleShare = async () => {
    const url = `${window.location.origin}/track/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Track ${id}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore permission errors
    }
  };

  // ── Render states ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col">
        <Navbar showBack backHref="/track" title="Tracking Details" />
        <LoadingSkeleton />
      </div>
    );
  }

  if (notFound || !delivery) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col">
        <Navbar showBack backHref="/track" title="Tracking Details" />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#191314] flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#FAFAFA] mb-1">Delivery not found</h2>
            <p className="text-sm text-gray-500 mb-4">
              We couldn&apos;t find a delivery with ID{' '}
              <span className="font-mono text-gray-300">{id}</span>.
            </p>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 bg-[#F2FF66] text-black font-semibold text-sm px-5 py-3 rounded-xl hover:bg-[#e8f55c] transition-colors"
          >
            Try another ID
          </Link>
        </div>
      </div>
    );
  }

  const isExpress = delivery.is_express;
  const riderName = delivery.rider?.name ?? null;
  const paymentLabel = PAYMENT_LABELS[delivery.payment_method] ?? delivery.payment_method;
  const isDelivered = delivery.status === 'delivered';
  const isConfirmed = delivery.status === 'confirmed';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col">
      <Navbar showBack backHref="/track" title="Tracking Details" />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Header: Tracking ID + Express badge ─────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Tracking ID</p>
            <h1 className="text-xl font-bold font-mono tracking-wider text-[#FAFAFA]">{id}</h1>
          </div>
          {isExpress && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 bg-[#F2FF66] text-black text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0 1 12 2v5h4a1 1 0 0 1 .82 1.573l-7 10A1 1 0 0 1 8 18v-5H4a1 1 0 0 1-.82-1.573l7-10a1 1 0 0 1 1.12-.381z" clipRule="evenodd" />
              </svg>
              Express
            </span>
          )}
        </div>

        {/* ── Progress bar ─────────────────────────────────── */}
        <div className="bg-[#191314] rounded-2xl px-3 py-4">
          <ProgressBar status={delivery.status} />
        </div>

        {/* ── Info cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoCard
            label="Sender"
            value={delivery.sender_name}
            sub={delivery.pickup_area}
            icon={<UserIcon />}
          />
          <InfoCard
            label="Recipient"
            value={delivery.recipient_name}
            sub={delivery.dropoff_area}
            icon={<MapPinIcon />}
          />
          <InfoCard
            label="Rider"
            value={riderName ?? 'Not yet assigned'}
            icon={<BikeIcon />}
          />
          {delivery.package_description && (
            <InfoCard
              label="Package"
              value={delivery.package_description}
              icon={<BoxIcon />}
            />
          )}
          <InfoCard
            label="Payment"
            value={paymentLabel}
            icon={<CardIcon />}
          />
        </div>

        {/* ── Confirm Receipt (only when status is 'delivered') ── */}
        {isDelivered && !confirmed && (
          <div className="bg-[#191314] rounded-2xl p-4 border border-[#F2FF66]/20">
            <p className="text-sm text-gray-300 mb-3">
              Has your package arrived? Confirm receipt to complete the delivery.
            </p>
            <button
              onClick={handleConfirmReceipt}
              disabled={confirming}
              className="w-full bg-[#F2FF66] text-black font-bold py-3 rounded-xl hover:bg-[#e8f55c] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4z" />
                  </svg>
                  Confirming…
                </>
              ) : (
                'Confirm Receipt'
              )}
            </button>
          </div>
        )}

        {/* ── Confirmed success note ───────────────────────── */}
        {(isConfirmed || confirmed) && (
          <div className="bg-green-950/40 border border-green-800 rounded-2xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-300 font-medium">Delivery confirmed. Thank you!</p>
          </div>
        )}

        {/* ── Timeline ─────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Delivery History
          </h2>
          <Timeline history={delivery.history ?? []} />
        </div>

        {/* ── Share button ─────────────────────────────────── */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-[#191314] border border-gray-800 hover:border-[#F2FF66]/40 text-[#FAFAFA] text-sm font-medium py-3 rounded-xl transition-colors active:scale-[0.98]"
        >
          <ShareIcon />
          {copied ? 'Link copied!' : 'Share tracking link'}
        </button>

        {/* Bottom spacer for mobile */}
        <div className="h-4" />
      </main>
    </div>
  );
}
