'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryStatus, STATUS_LABELS } from '@/lib/types';
import { Box, Routing2, TickCircle, Wallet2 } from 'iconsax-react';

interface Stats {
  total_today: number;
  active: number;
  completed: number;
  total_revenue: number;
  by_status: Partial<Record<DeliveryStatus, number>>;
}

const STAT_COLORS: Record<DeliveryStatus, string> = {
  pending:          'bg-[#3a4450]',
  assigned:         'bg-[#2d5a8a]',
  picked_up:        'bg-[#5a4018]',
  in_transit:       'bg-[#4a3010]',
  delivered:        'bg-[#1e5030]',
  confirmed:        'bg-[#153820]',
  cancelled:        'bg-[#6a2828]',
  delivery_failed:  'bg-[#802820]',
  returning:        'bg-[#2a3560]',
  returned:         'bg-[#3a2558]',
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
      const res = await fetch('/api/deliveries?limit=15&sort=desc', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecent(Array.isArray(data) ? data : (data.deliveries ?? []));
    } catch { /* silent */ }
    finally { setRecentLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecent();
    const interval = setInterval(() => { fetchStats(); fetchRecent(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRecent]);

  const statCards = [
    {
      label: 'Total Today',
      value: statsLoading ? null : stats?.total_today ?? 0,
      icon: <Box size={18} color="currentColor" />,
      accent: 'text-[#6a8fbf] bg-[rgba(65,100,155,0.12)]',
    },
    {
      label: 'Active',
      value: statsLoading ? null : stats?.active ?? 0,
      icon: <Routing2 size={18} color="currentColor" />,
      accent: 'text-[#aa8040] bg-[rgba(150,105,35,0.12)]',
    },
    {
      label: 'Completed',
      value: statsLoading ? null : stats?.completed ?? 0,
      icon: <TickCircle size={18} color="currentColor" />,
      accent: 'text-[#3d8050] bg-[rgba(38,100,58,0.12)]',
    },
    {
      label: 'Revenue',
      value: statsLoading ? null : formatNaira(stats?.total_revenue),
      icon: <Wallet2 size={18} color="currentColor" />,
      accent: 'text-[#a1a4a5] bg-[rgba(255,255,255,0.06)]',
    },
  ];

  const breakdownEntries = stats?.by_status
    ? (Object.entries(stats.by_status) as [DeliveryStatus, number][]).filter(([, v]) => v > 0)
    : [];
  const breakdownTotal = breakdownEntries.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Dashboard</h1>
          <p className="text-[#a1a4a5] text-xs mt-0.5">Live operations overview</p>
        </div>
        <span className="text-[#a1a4a5] text-xs bg-[#070707] border border-[rgba(255,255,255,0.08)] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#3d8050] rounded-full animate-pulse" />
          Auto-refresh 30s
        </span>
      </div>

      {error && (
        <div className="p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">{error}</div>
      )}

      {/* ── Stat Cards — 4 columns on desktop, 2 on mobile ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex items-center gap-3"
          >
            {statsLoading || card.value === null ? (
              <div className="w-full space-y-2">
                <div className="w-9 h-9 bg-[rgba(255,255,255,0.08)] rounded-xl animate-pulse" />
                <div className="w-16 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                <div className="w-20 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.accent}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[#a1a4a5] text-[11px] leading-tight">{card.label}</p>
                  <p className="text-xl font-bold text-[#f0f0f0] mt-0.5 leading-none truncate">{card.value}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Body: two-column on desktop ── */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5 items-start">

        {/* ── Left: Status Breakdown ── */}
        <div className="space-y-3">
          {/* Breakdown card */}
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-3">Status Breakdown</h2>

            {statsLoading || breakdownEntries.length === 0 ? (
              <div className="space-y-2.5">
                <div className="h-3 bg-[rgba(255,255,255,0.08)] rounded-full animate-pulse" />
                {Array(4).fill(null).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="w-24 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                    <div className="w-8 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="flex rounded-full overflow-hidden h-2.5 mb-4 gap-px">
                  {breakdownEntries.map(([status, count]) => (
                    <div
                      key={status}
                      className={`${STAT_COLORS[status]} rounded-full`}
                      style={{ width: `${(count / breakdownTotal) * 100}%` }}
                      title={`${STATUS_LABELS[status]}: ${count}`}
                    />
                  ))}
                </div>

                {/* Legend rows */}
                <div className="space-y-2">
                  {breakdownEntries.map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STAT_COLORS[status]}`} />
                        <span className="text-[#a1a4a5]">{STATUS_LABELS[status]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#a1a4a5]">
                          {Math.round((count / breakdownTotal) * 100)}%
                        </span>
                        <span className="text-[#f0f0f0] font-semibold w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs">
                    <span className="text-[#a1a4a5]">Total</span>
                    <span className="text-[#f0f0f0] font-bold">{breakdownTotal}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Recent Activity (fills remaining width) ── */}
        <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f0f0f0]">Recent Activity</h2>
            <span className="text-[#a1a4a5] text-xs">Last 15 orders</span>
          </div>

          {recentLoading ? (
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="w-32 h-3.5 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                    <div className="w-48 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-5 bg-[rgba(255,255,255,0.08)] rounded-full animate-pulse" />
                    <div className="w-12 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#a1a4a5] text-sm">No recent activity</div>
          ) : (
            <ul className="divide-y divide-[rgba(255,255,255,0.06)]">
              {recent.map((d) => (
                <li key={d.id} className="px-4 py-3 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  {/* Tracking ID */}
                  <p className="font-mono text-xs text-[#a1a4a5] flex-shrink-0 w-28 truncate">{d.id}</p>

                  {/* Route */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f0f0] text-sm truncate">
                      {d.sender_name}
                      <span className="text-[#a1a4a5] mx-1.5">→</span>
                      {d.recipient_name}
                    </p>
                    <p className="text-[#a1a4a5] text-xs truncate mt-0.5">
                      {d.pickup_area} → {d.dropoff_area}
                    </p>
                  </div>

                  {/* Fee */}
                  {d.fee != null && (
                    <p className="text-[#f0f0f0] text-xs font-medium flex-shrink-0">
                      ₦{d.fee.toLocaleString()}
                    </p>
                  )}

                  {/* Status + time */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={d.status} />
                    <span className="text-[#a1a4a5] text-[11px] w-14 text-right">{timeAgo(d.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
