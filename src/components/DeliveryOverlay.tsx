'use client';

import { useEffect, useState, useRef } from 'react';
import ProgressBar from '@/components/ProgressBar';
import Timeline from '@/components/Timeline';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryHistory, PAYMENT_LABELS } from '@/lib/types';

interface DeliveryWithHistory extends Delivery {
  history: DeliveryHistory[];
}

interface DeliveryOverlayProps {
  trackingId: string | null;
  onClose: () => void;
}

export default function DeliveryOverlay({ trackingId, onClose }: DeliveryOverlayProps) {
  const [delivery, setDelivery] = useState<DeliveryWithHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Animate in/out
  useEffect(() => {
    if (trackingId) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [trackingId]);

  useEffect(() => {
    if (!trackingId) {
      setDelivery(null);
      setNotFound(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setNotFound(false);
    setDelivery(null);

    fetch(`/api/deliveries/${trackingId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setDelivery(data.delivery);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [trackingId]);

  if (!trackingId && !isVisible) return null;

  const riderName = delivery?.rider?.name ?? null;
  const paymentLabel = delivery ? (PAYMENT_LABELS[delivery.payment_method] ?? delivery.payment_method) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
          w-full max-w-md h-full bg-[#070707] border-l border-[rgba(255,255,255,0.08)]
          overflow-y-auto flex flex-col
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#070707] border-b border-[rgba(255,255,255,0.08)] px-4 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <p className="text-[#a1a4a5] text-xs mb-0.5">Tracking ID</p>
            <h2 className="font-mono text-[#F2FF66] font-bold text-base leading-tight">{trackingId}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a1a4a5] hover:text-[#f0f0f0] hover:bg-[rgba(255,255,255,0.08)] transition-colors text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-[rgba(255,255,255,0.08)] rounded-xl" />
              <div className="h-24 bg-[rgba(255,255,255,0.08)] rounded-xl" />
              <div className="h-32 bg-[rgba(255,255,255,0.08)] rounded-xl" />
            </div>
          )}

          {/* Not Found */}
          {!loading && notFound && (
            <div className="bg-[rgba(135,55,55,0.12)] border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-[#a85858] text-sm font-medium">Delivery not found</p>
              <p className="text-[#a85858]/60 text-xs mt-1">
                No delivery with ID <span className="font-mono">{trackingId}</span>
              </p>
            </div>
          )}

          {/* Delivery Data */}
          {!loading && delivery && (
            <>
              {/* Status + Express */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={delivery.status} />
                  {delivery.is_express && (
                    <span className="text-[10px] bg-[rgba(150,105,35,0.18)] text-[#aa8040] border border-[rgba(150,105,35,0.25)] px-1.5 py-0.5 rounded-full font-medium">
                      EXPRESS
                    </span>
                  )}
                </div>
                <a
                  href={`/track/${delivery.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F2FF66] text-xs font-medium hover:underline flex items-center gap-1"
                >
                  Open full page
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Progress Bar */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2">
                <ProgressBar status={delivery.status} />
              </div>

              {/* Sender */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-2">Sender</p>
                <p className="text-[#f0f0f0] text-sm font-medium">{delivery.sender_name}</p>
                <p className="text-[#a1a4a5] text-xs mt-0.5">{delivery.sender_phone}</p>
              </div>

              {/* Route */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#a1a4a5] mb-1">Pickup</p>
                  <p className="text-[#f0f0f0] font-medium">{delivery.pickup_area}</p>
                  <p className="text-[#a1a4a5] mt-0.5 leading-tight">{delivery.pickup_address}</p>
                  {delivery.pickup_date && (
                    <p className="text-[#F2FF66] text-[10px] mt-1">
                      {new Date(delivery.pickup_date).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[#a1a4a5] mb-1">Dropoff</p>
                  <p className="text-[#f0f0f0] font-medium">{delivery.dropoff_area}</p>
                  <p className="text-[#a1a4a5] mt-0.5 leading-tight">{delivery.dropoff_address}</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-2">Recipient</p>
                <p className="text-[#f0f0f0] text-sm font-medium">{delivery.recipient_name}</p>
                <p className="text-[#a1a4a5] text-xs mt-0.5">{delivery.recipient_phone}</p>
              </div>

              {/* Rider */}
              <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-2">Rider</p>
                <p className="text-[#f0f0f0] text-sm font-medium">{riderName ?? 'Not yet assigned'}</p>
                {delivery.rider?.phone && (
                  <p className="text-[#a1a4a5] text-xs mt-0.5">{delivery.rider.phone}</p>
                )}
              </div>

              {/* Package + Payment */}
              <div className="grid grid-cols-2 gap-3">
                {delivery.package_description && (
                  <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                    <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-2">Package</p>
                    <p className="text-[#f0f0f0] text-xs leading-snug">{delivery.package_description}</p>
                  </div>
                )}
                <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-2">Payment</p>
                  <p className="text-[#f0f0f0] text-xs">{paymentLabel}</p>
                  {delivery.fee != null && (
                    <p className="text-[#F2FF66] text-sm font-bold mt-1">{'\u20A6'}{delivery.fee.toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {delivery.history && delivery.history.length > 0 && (
                <div className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wide font-medium mb-3">Timeline</p>
                  <Timeline history={delivery.history} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
