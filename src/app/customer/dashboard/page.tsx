'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import Timeline from '@/components/Timeline';
import DeliveryOverlay from '@/components/DeliveryOverlay';
import { Delivery, DeliveryHistory } from '@/lib/types';

interface Stats {
  total: number;
  pending: number;
  assigned: number;
  picked_up: number;
  in_transit: number;
  delivered: number;
  confirmed: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Sort: active (non-delivered/confirmed) by pickup_date ASC then created_at DESC, then completed at bottom
function sortRecentOrders(orders: Delivery[]): Delivery[] {
  const active = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'confirmed'
  );
  const completed = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'confirmed'
  );

  active.sort((a, b) => {
    if (a.pickup_date && b.pickup_date) {
      return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
    }
    if (a.pickup_date) return -1;
    if (b.pickup_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  completed.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return [...active, ...completed];
}

// Track Order Overlay
function TrackOverlay({ onClose }: { onClose: () => void }) {
  const [trackingId, setTrackingId] = useState('');
  const [searching, setSearching] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [error, setError] = useState('');

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const id = trackingId.trim().toUpperCase();
    if (!id) return;
    setSearching(true);
    setError('');
    setDelivery(null);
    setHistory([]);

    try {
      const res = await fetch(`/api/deliveries/${id}`);
      if (!res.ok) {
        setError('Order not found. Check your tracking ID.');
        setSearching(false);
        return;
      }
      const data = await res.json();
      const del = data.delivery || data;
      setDelivery(del);
      // History is included in the delivery response
      setHistory(del.history || data.history || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#2A2A2A] overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#FAFAFA]">Track Order</h2>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-[#FAFAFA] text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              placeholder="Enter tracking ID (e.g. BB-XXXXXX)"
              className="flex-1 bg-[#191314] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#888888] focus:outline-none focus:border-[#F2FF66]/40 font-mono"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching || !trackingId.trim()}
              className="bg-[#F2FF66] text-[#0A0A0A] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? '...' : 'Track'}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {delivery && (
            <div className="space-y-4">
              {/* Tracking ID + Status */}
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[#F2FF66] font-bold text-lg">{delivery.id}</span>
                  <StatusBadge status={delivery.status} />
                </div>
                <ProgressBar status={delivery.status} />
              </div>

              {/* Route */}
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#888888] text-xs mb-1">Pickup</p>
                    <p className="text-[#FAFAFA]">{delivery.pickup_area}</p>
                    <p className="text-[#888888] text-xs mt-0.5">{delivery.pickup_address}</p>
                  </div>
                  <div>
                    <p className="text-[#888888] text-xs mb-1">Dropoff</p>
                    <p className="text-[#FAFAFA]">{delivery.dropoff_area}</p>
                    <p className="text-[#888888] text-xs mt-0.5">{delivery.dropoff_address}</p>
                  </div>
                </div>
              </div>

              {/* Recipient + Package */}
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#888888] text-xs mb-1">Recipient</p>
                    <p className="text-[#FAFAFA]">{delivery.recipient_name}</p>
                    <p className="text-[#888888] text-xs">{delivery.recipient_phone}</p>
                  </div>
                  {delivery.fee != null && (
                    <div>
                      <p className="text-[#888888] text-xs mb-1">Fee</p>
                      <p className="text-[#F2FF66] font-bold">{'\u20A6'}{delivery.fee.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {history.length > 0 && (
                <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
                  <p className="text-[#888888] text-xs font-medium uppercase tracking-wide mb-3">Timeline</p>
                  <Timeline history={history} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, confirmed: 0 });
  const [recentOrders, setRecentOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [showTrackOverlay, setShowTrackOverlay] = useState(false);
  const [overlayTrackingId, setOverlayTrackingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/customer/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/customer/deliveries?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const list = Array.isArray(ordersData) ? ordersData : ordersData.deliveries || [];
        setRecentOrders(sortRecentOrders(list));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
      setCustomerName(info.name || '');
    } catch {
      setCustomerName('');
    }

    fetchData();

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = [
    { label: 'Total Orders', value: stats.total, color: 'text-[#F2FF66]' },
    { label: 'Pending', value: stats.pending + stats.assigned, color: 'text-gray-400' },
    { label: 'In Transit', value: stats.picked_up + stats.in_transit, color: 'text-amber-400' },
    { label: 'Delivered', value: stats.delivered + stats.confirmed, color: 'text-green-400' },
  ];

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* Header Row — greeting left, action buttons right */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#FAFAFA]">
            {getGreeting()}{customerName ? `, ${customerName}` : ''}
          </h1>
          <p className="text-[#888888] text-sm mt-1">Here&apos;s your delivery overview</p>
        </div>

        {/* Action Buttons — top right on desktop, full width on mobile */}
        <div className="flex gap-3 flex-shrink-0">
          <Link
            href="/customer/orders/create"
            className="flex-1 md:flex-none bg-[#F2FF66] text-[#0A0A0A] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] active:scale-95 transition-all text-center"
          >
            + Create Order
          </Link>
          <button
            onClick={() => setShowTrackOverlay(true)}
            className="flex-1 md:flex-none border border-[#F2FF66] text-[#F2FF66] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F2FF66]/10 active:scale-95 transition-all"
          >
            Track Order
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4"
          >
            <p className="text-[#888888] text-xs font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl md:text-3xl font-bold mt-1 ${card.color}`}>
              {loading ? '-' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#FAFAFA]">Recent Orders</h2>
          <Link
            href="/customer/orders"
            className="text-[#F2FF66] text-xs font-medium hover:underline"
          >
            View All Orders
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <p className="text-[#888888] text-sm">No orders yet</p>
            <Link
              href="/customer/orders/create"
              className="inline-block mt-3 text-[#F2FF66] text-sm font-medium hover:underline"
            >
              Create your first order
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setOverlayTrackingId(order.id)}
                className="w-full bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 text-left hover:border-[#F2FF66]/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#F2FF66] truncate">{order.id}</p>
                    <p className="text-sm text-[#FAFAFA] mt-1 truncate">
                      {order.pickup_area} {'\u2192'} {order.dropoff_area}
                    </p>
                    <p className="text-xs text-[#888888] mt-1">
                      {order.pickup_date
                        ? new Date(order.pickup_date).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : new Date(order.created_at).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Track Order Overlay */}
      {showTrackOverlay && (
        <TrackOverlay onClose={() => setShowTrackOverlay(false)} />
      )}

      {/* Delivery Detail Overlay */}
      <DeliveryOverlay
        trackingId={overlayTrackingId}
        onClose={() => setOverlayTrackingId(null)}
      />
    </div>
  );
}
