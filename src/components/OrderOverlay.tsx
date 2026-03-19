'use client';

import { useEffect, useState, useRef } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryHistory, PAYMENT_LABELS } from '@/lib/types';

interface OrderDelivery extends Delivery {
  delivery_history?: DeliveryHistory[];
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string | null;
  pickup_area: string;
  pickup_address: string;
  pickup_date: string | null;
  payment_method: string;
  is_express: boolean;
  total_fee: number | null;
  customer_id: number;
  created_at: string;
  deliveries: OrderDelivery[];
}

interface OrderOverlayProps {
  orderNumber: string | null;
  onClose: () => void;
}

export default function OrderOverlay({ orderNumber, onClose }: OrderOverlayProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (orderNumber) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      setNotFound(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const token = typeof window !== 'undefined' ? localStorage.getItem('customer_token') : null;

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    fetch(`/api/orders/${orderNumber}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setOrder(data.order);
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
  }, [orderNumber]);

  if (!orderNumber && !isVisible) return null;

  const paymentLabel = order
    ? (PAYMENT_LABELS[order.payment_method as keyof typeof PAYMENT_LABELS] ?? order.payment_method)
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
          w-full max-w-md h-full bg-[#191314] border-l border-[#2A2A2A]
          overflow-y-auto flex flex-col
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#191314] border-b border-[#2A2A2A] px-4 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <p className="text-[#888888] text-xs mb-0.5">Order</p>
            <h2 className="font-mono text-[#F2FF66] font-bold text-base leading-tight">
              {orderNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#888888] hover:text-[#FAFAFA] hover:bg-[#2A2A2A] transition-colors text-lg leading-none"
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
              <div className="h-12 bg-[#2A2A2A] rounded-xl" />
              <div className="h-28 bg-[#2A2A2A] rounded-xl" />
              <div className="h-20 bg-[#2A2A2A] rounded-xl" />
              <div className="h-20 bg-[#2A2A2A] rounded-xl" />
            </div>
          )}

          {/* Not Found */}
          {!loading && notFound && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm font-medium">Order not found</p>
              <p className="text-red-400/60 text-xs mt-1">
                No order with number <span className="font-mono">{orderNumber}</span>
              </p>
            </div>
          )}

          {/* Order Data */}
          {!loading && order && (
            <>
              {/* Status Badge */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
                <StatusBadge status={order.status as Parameters<typeof StatusBadge>[0]['status']} />
                {order.is_express && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-medium">
                    EXPRESS
                  </span>
                )}
              </div>

              {/* Pickup Section */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 space-y-1">
                <p className="text-[#888888] text-[10px] uppercase tracking-wide font-medium mb-2">Pickup</p>
                <p className="text-[#FAFAFA] text-sm font-medium">{order.sender_name}</p>
                <p className="text-[#888888] text-xs">{order.sender_phone}</p>
                <div className="mt-2 pt-2 border-t border-[#2A2A2A]">
                  <p className="text-[#FAFAFA] text-sm">{order.pickup_area}</p>
                  <p className="text-[#888888] text-xs mt-0.5">{order.pickup_address}</p>
                </div>
                {order.pickup_date && (
                  <p className="text-[#F2FF66] text-xs mt-1">
                    Scheduled:{' '}
                    {new Date(order.pickup_date).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[#888888] text-xs">{paymentLabel}</span>
                  {order.is_express && (
                    <span className="text-amber-400 text-[10px] font-medium">Express Delivery</span>
                  )}
                </div>
              </div>

              {/* Deliveries Section */}
              {order.deliveries && order.deliveries.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[#888888] text-[10px] uppercase tracking-wide font-medium">
                    Deliveries ({order.deliveries.length})
                  </p>
                  {order.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 space-y-3"
                    >
                      {/* Tracking ID + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[#F2FF66] text-sm font-bold">{delivery.id}</span>
                        <StatusBadge status={delivery.status} />
                      </div>

                      {/* Recipient */}
                      <div className="text-xs">
                        <p className="text-[#888888] mb-0.5">Recipient</p>
                        <p className="text-[#FAFAFA] font-medium">{delivery.recipient_name}</p>
                        <p className="text-[#888888]">{delivery.recipient_phone}</p>
                      </div>

                      {/* Route */}
                      <div className="text-xs">
                        <p className="text-[#888888] mb-0.5">Destination</p>
                        <p className="text-[#FAFAFA]">
                          {delivery.dropoff_area}{' '}
                          <span className="text-[#888888]">{'\u2192'}</span>{' '}
                          {delivery.dropoff_address}
                        </p>
                      </div>

                      {/* Package */}
                      {delivery.package_description && (
                        <div className="text-xs">
                          <p className="text-[#888888] mb-0.5">Package</p>
                          <p className="text-[#FAFAFA]">{delivery.package_description}</p>
                        </div>
                      )}

                      {/* Track link */}
                      <a
                        href={`/track/${delivery.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#F2FF66] font-medium hover:underline"
                      >
                        Track
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Fee */}
              {order.total_fee != null && (
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between">
                  <p className="text-[#888888] text-sm">Total Fee</p>
                  <p className="text-[#F2FF66] font-bold text-lg">
                    {'\u20A6'}{order.total_fee.toLocaleString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
