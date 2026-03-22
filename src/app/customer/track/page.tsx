'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Delivery } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

export default function CustomerTrack() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [recentOrders, setRecentOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentOrders = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    try {
      const res = await fetch('/api/customer/deliveries?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentOrders(Array.isArray(data) ? data : data.deliveries || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const id = trackingId.trim();
    if (id) {
      router.push(`/track/${id}`);
    }
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#f0f0f0]">Track Order</h1>
        <p className="text-[#a1a4a5] text-sm mt-1">Enter a tracking ID or select a recent order</p>
      </div>

      {/* Search */}
      <form onSubmit={handleTrack} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a4a5]">{'\u{1F50D}'}</span>
          <input
            type="text"
            placeholder="Enter tracking ID..."
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg pl-10 pr-4 py-3 text-sm text-[#f0f0f0] placeholder-[#a1a4a5] focus:outline-none focus:border-[#212629] font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!trackingId.trim()}
          className="bg-[#F2FF66] text-[#000000] px-5 py-3 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Track
        </button>
      </form>

      {/* Recent Orders */}
      <div>
        <h2 className="text-sm font-semibold text-[#a1a4a5] uppercase tracking-wide mb-3">
          Recent Orders
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
            <p className="text-[#a1a4a5] text-sm">No recent orders to track</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/track/${order.id}`)}
                className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-left hover:border-[#212629] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#a1a4a5] truncate">{order.id}</p>
                    <p className="text-sm text-[#f0f0f0] mt-1 truncate">
                      {order.pickup_area} {'\u2192'} {order.dropoff_area}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
