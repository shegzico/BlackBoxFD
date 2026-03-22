'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import Timeline from '@/components/Timeline';
import { Delivery, DeliveryHistory, PAYMENT_LABELS } from '@/lib/types';
import { Profile, Location, Routing2, Box, Card, Share, Refresh2, TickCircle, Flash, Danger } from 'iconsax-react';

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
    <div className={`animate-pulse rounded-lg bg-[#070707] ${className ?? ''}`} />
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
    <div className="bg-[#070707] rounded-xl p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#a1a4a5]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-[#f0f0f0] truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
        <Navbar showBack backHref="/track" title="Tracking Details" />
        <LoadingSkeleton />
      </div>
    );
  }

  if (notFound || !delivery) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
        <Navbar showBack backHref="/track" title="Tracking Details" />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#070707] flex items-center justify-center">
            <Danger size={32} color="#4b5563" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#f0f0f0] mb-1">Delivery not found</h2>
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
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <Navbar showBack backHref="/track" title="Tracking Details" />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Header: Tracking ID + Express badge ─────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Tracking ID</p>
            <h1 className="text-xl font-bold font-mono tracking-wider text-[#f0f0f0]">{id}</h1>
          </div>
          {isExpress && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 bg-[#F2FF66] text-black text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              <Flash size={12} color="currentColor" />
              Express
            </span>
          )}
        </div>

        {/* ── Progress bar ─────────────────────────────────── */}
        <div className="bg-[#070707] rounded-2xl px-3 py-4">
          <ProgressBar status={delivery.status} />
        </div>

        {/* ── Info cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoCard
            label="Sender"
            value={delivery.sender_name}
            sub={delivery.pickup_area}
            icon={<Profile size={16} color="currentColor" />}
          />
          <InfoCard
            label="Recipient"
            value={delivery.recipient_name}
            sub={delivery.dropoff_area}
            icon={<Location size={16} color="currentColor" />}
          />
          <InfoCard
            label="Rider"
            value={riderName ?? 'Not yet assigned'}
            icon={<Routing2 size={16} color="currentColor" />}
          />
          {delivery.package_description && (
            <InfoCard
              label="Package"
              value={delivery.package_description}
              icon={<Box size={16} color="currentColor" />}
            />
          )}
          <InfoCard
            label="Payment"
            value={paymentLabel}
            icon={<Card size={16} color="currentColor" />}
          />
        </div>

        {/* ── Confirm Receipt (only when status is 'delivered') ── */}
        {isDelivered && !confirmed && (
          <div className="bg-[#070707] rounded-2xl p-4 border border-[#F2FF66]/20">
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
                  <Refresh2 size={16} className="animate-spin" />
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
            <TickCircle size={20} color="#3d8050" />
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
          className="w-full flex items-center justify-center gap-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] hover:border-[#212629] text-[#f0f0f0] text-sm font-medium py-3 rounded-xl transition-colors active:scale-[0.98]"
        >
          <Share size={16} color="currentColor" />
          {copied ? 'Link copied!' : 'Share tracking link'}
        </button>

        {/* Bottom spacer for mobile */}
        <div className="h-4" />
      </main>
    </div>
  );
}
