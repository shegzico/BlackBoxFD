'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryStatus, STATUS_LABELS } from '@/lib/types';

interface Stats {
  total_today: number;
  active: number;
  completed: number;
  total_revenue: number;
  by_status: Partial<Record<DeliveryStatus, number>>;
}

const STAT_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-gray-500',
  assigned: 'bg-[#2d5a8a]',
  picked_up: 'bg-[#5a4018]',
  in_transit: 'bg-[#4a3010]',
  delivered: 'bg-[#1e5030]',
  confirmed: 'bg-[#153820]',
  cancelled: 'bg-[#6a2828]',
};

function formatNaira(amount: number | undefined | null): string {
  return '₦' + (amount ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Delivery[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/bb-admin'); return; }
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/bb-admin'); return; }
      const data = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load stats.');
    } finally {
      setStatsLoading(false);
    }
  }, [router]);

  const fetchRecent = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/deliveries?limit=10&sort=desc', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecent(Array.isArray(data) ? data : (data.deliveries ?? []));
    } catch {
      // silent
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecent();
    const interval = setInterval(() => {
      fetchStats();
      fetchRecent();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRecent]);

  const statCards = stats
    ? [
        { label: 'Total Today', value: stats.total_today, icon: '📋' },
        { label: 'Active', value: stats.active, icon: '🏍️' },
        { label: 'Completed', value: stats.completed, icon: '✅' },
        { label: 'Revenue', value: formatNaira(stats.total_revenue), icon: '💰' },
      ]
    : Array(4).fill(null);

  const breakdownEntries = stats?.by_status
    ? (Object.entries(stats.by_status) as [DeliveryStatus, number][]).filter(([, v]) => v > 0)
    : [];
  const breakdownTotal = breakdownEntries.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Dashboard</h1>
          <p className="text-[#a1a4a5] text-xs mt-0.5">Live operations overview</p>
        </div>
        <span className="text-[#a1a4a5] text-xs bg-[#070707] border border-[rgba(255,255,255,0.08)] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#1e5030] rounded-full animate-pulse" />
          Auto-refresh 30s
        </span>
      </div>

      {error && (
        <div className="p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">{error}</div>
      )}

      {/* Stats Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col gap-2"
          >
            {statsLoading || !card ? (
              <div className="space-y-2">
                <div className="w-8 h-8 bg-[rgba(255,255,255,0.08)] rounded-lg animate-pulse" />
                <div className="w-16 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                <div className="w-20 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
              </div>
            ) : (
              <>
                <span className="text-2xl leading-none">{card.icon}</span>
                <p className="text-2xl font-bold text-[#f0f0f0] leading-none">{card.value}</p>
                <p className="text-[#a1a4a5] text-xs">{card.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      {!statsLoading && stats && breakdownEntries.length > 0 && (
        <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-3">Status Breakdown</h2>
          <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
            {breakdownEntries.map(([status, count]) => (
              <div
                key={status}
                className={`${STAT_COLORS[status]} rounded-full`}
                style={{ width: `${(count / breakdownTotal) * 100}%` }}
                title={`${STATUS_LABELS[status]}: ${count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {breakdownEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${STAT_COLORS[status]}`} />
                <span className="text-[#a1a4a5]">{STATUS_LABELS[status]}</span>
                <span className="text-[#f0f0f0] font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#f0f0f0]">Recent Activity</h2>
          <span className="text-[#a1a4a5] text-xs">Last 10 orders</span>
        </div>

        {recentLoading ? (
          <div className="divide-y divide-[rgba(255,255,255,0.08)]">
            {Array(5).fill(null).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="w-28 h-3.5 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                  <div className="w-40 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-[rgba(255,255,255,0.08)] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#a1a4a5] text-sm">No recent activity</div>
        ) : (
          <ul className="divide-y divide-[rgba(255,255,255,0.08)]">
            {recent.map((d) => (
              <li key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[#f0f0f0] text-sm font-mono font-medium truncate">{d.id}</p>
                  <p className="text-[#a1a4a5] text-xs truncate">
                    {d.sender_name} → {d.recipient_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={d.status} />
                  <span className="text-[#a1a4a5] text-xs">{timeAgo(d.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
