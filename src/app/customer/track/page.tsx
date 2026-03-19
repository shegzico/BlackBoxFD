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
        <h1 className="text-xl font-bold text-[#FAFAFA]">Track Order</h1>
        <p className="text-[#888888] text-sm mt-1">Enter a tracking ID or select a recent order</p>
      </div>

      {/* Search */}
      <form onSubmit={handleTrack} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">{'\u{1F50D}'}</span>
          <input
            type="text"
            placeholder="Enter tracking ID..."
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="w-full bg-[#191314] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-3 text-sm text-[#FAFAFA] placeholder-[#888888] focus:outline-none focus:border-[#F2FF66]/40 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!trackingId.trim()}
          className="bg-[#F2FF66] text-[#0A0A0A] px-5 py-3 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Track
        </button>
      </form>

      {/* Recent Orders */}
      <div>
        <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide mb-3">
          Recent Orders
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <p className="text-[#888888] text-sm">No recent orders to track</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/track/${order.id}`)}
                className="w-full bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 text-left hover:border-[#F2FF66]/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#F2FF66] truncate">{order.id}</p>
                    <p className="text-sm text-[#FAFAFA] mt-1 truncate">
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
