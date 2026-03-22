'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Delivery, PAYMENT_LABELS, PaymentMethod } from '@/lib/types';
import { Refresh2, DocumentDownload, Calendar, CalendarEdit, Money } from 'iconsax-react';

type DateFilter = 'today' | 'week' | 'month' | 'all';

interface FinanceStats {
  daily: number;
  weekly: number;
  monthly: number;
  by_payment_method: Partial<Record<PaymentMethod, number>>;
}

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  sender_pays: 'bg-[#2d5a8a]',
  receiver_pays: 'bg-[#5a4018]',
};

function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function filterByDate(deliveries: Delivery[], filter: DateFilter): Delivery[] {
  const now = new Date();
  return deliveries.filter((d) => {
    if (filter === 'all') return true;
    const created = new Date(d.created_at);
    if (filter === 'today') {
      return created.toDateString() === now.toDateString();
    }
    if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return created >= startOfWeek;
    }
    if (filter === 'month') {
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

export default function AdminFinancesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [exportLoading, setExportLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
    return token;
  }, [router]);

  const fetchDeliveries = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      // Fetch completed/confirmed deliveries for finance view
      const res = await fetch('/api/deliveries?status=delivered,confirmed', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const all = Array.isArray(data) ? data : (data.deliveries ?? []);
      // Filter to only those with fees
      setDeliveries(all.filter((d: Delivery) => d.fee != null));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Map stats response to finance stats
      setStats({
        daily: data.daily_revenue ?? data.revenue ?? 0,
        weekly: data.weekly_revenue ?? 0,
        monthly: data.monthly_revenue ?? 0,
        by_payment_method: data.by_payment_method ?? {},
      });
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDeliveries();
    fetchStats();
  }, [fetchDeliveries, fetchStats]);

  const filtered = filterByDate(deliveries, dateFilter);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Compute totals from filtered list
  const filteredRevenue = filtered.reduce((acc, d) => acc + (d.fee ?? 0), 0);

  // Payment method breakdown from filtered
  const pmBreakdown: Partial<Record<PaymentMethod, number>> = {};
  for (const d of filtered) {
    if (d.fee != null) {
      pmBreakdown[d.payment_method] = (pmBreakdown[d.payment_method] ?? 0) + d.fee;
    }
  }
  const pmTotal = Object.values(pmBreakdown).reduce((a, b) => a + (b ?? 0), 0);

  async function handleExport() {
    const token = getToken();
    if (!token) return;
    setExportLoading(true);
    try {
      const res = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blackbox-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  const revenueCards = [
    { label: 'Daily', value: statsLoading ? null : (stats?.daily ?? 0), icon: <Calendar size={20} color="currentColor" /> },
    { label: 'Weekly', value: statsLoading ? null : (stats?.weekly ?? 0), icon: <CalendarEdit size={20} color="currentColor" /> },
    { label: 'Monthly', value: statsLoading ? null : (stats?.monthly ?? 0), icon: <Money size={20} color="currentColor" /> },
  ];

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Finances</h1>
          <p className="text-[#a1a4a5] text-xs mt-0.5">Revenue and payment overview</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="
            border border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0] hover:border-[#212629]
            text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {exportLoading ? (
            <>
              <Refresh2 size={16} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <><DocumentDownload size={16} color="currentColor" /> Export CSV</>
          )}
        </button>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-3 gap-3">
        {revenueCards.map((card) => (
          <div key={card.label} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 md:p-4">
            {card.value == null ? (
              <div className="space-y-2">
                <div className="w-6 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                <div className="w-full h-5 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
                <div className="w-16 h-3 bg-[rgba(255,255,255,0.08)] rounded animate-pulse" />
              </div>
            ) : (
              <>
                <span className="flex items-center">{card.icon}</span>
                <p className="text-lg md:text-2xl font-bold text-[#f0f0f0] mt-2 leading-none break-all">
                  {formatNaira(card.value)}
                </p>
                <p className="text-[#a1a4a5] text-xs mt-1">{card.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Payment Method Breakdown */}
      {!statsLoading && (
        <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-3">Revenue by Payment Method</h2>
          {pmTotal === 0 ? (
            <p className="text-[#a1a4a5] text-sm">No data for selected period.</p>
          ) : (
            <>
              {/* Breakdown Bar */}
              <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
                {(Object.entries(pmBreakdown) as [PaymentMethod, number][])
                  .filter(([, v]) => v > 0)
                  .map(([method, amount]) => (
                    <div
                      key={method}
                      className={`${PAYMENT_METHOD_COLORS[method]} rounded-full`}
                      style={{ width: `${(amount / pmTotal) * 100}%` }}
                      title={`${PAYMENT_LABELS[method]}: ${formatNaira(amount)}`}
                    />
                  ))}
              </div>

              {/* Breakdown Items */}
              <div className="space-y-2">
                {(Object.entries(pmBreakdown) as [PaymentMethod, number][])
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => {
                    const pct = pmTotal > 0 ? Math.round((amount / pmTotal) * 100) : 0;
                    return (
                      <div key={method} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${PAYMENT_METHOD_COLORS[method]}`} />
                          <span className="text-[#a1a4a5]">{PAYMENT_LABELS[method]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#a1a4a5] text-xs">{pct}%</span>
                          <span className="text-[#f0f0f0] font-medium">{formatNaira(amount)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Date Filter + Table */}
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        {/* Filter + Summary Header */}
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {DATE_FILTERS.map((df) => (
              <button
                key={df.value}
                onClick={() => { setDateFilter(df.value); setPage(1); }}
                className={`
                  flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${dateFilter === df.value
                    ? 'bg-[#18191ce0] text-[#f0f0f0] border border-[rgba(255,255,255,0.12)]'
                    : 'border border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0]'
                  }
                `}
              >
                {df.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <span className="text-[#a1a4a5] text-xs">{filtered.length} orders</span>
            <span className="text-[#f0f0f0] font-semibold text-sm">{formatNaira(filteredRevenue)}</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="divide-y divide-[rgba(255,255,255,0.08)]">
            {Array(5).fill(null).map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="w-28 h-3 bg-[rgba(255,255,255,0.08)] rounded" />
                <div className="w-20 h-3 bg-[rgba(255,255,255,0.08)] rounded" />
                <div className="w-16 h-3 bg-[rgba(255,255,255,0.08)] rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[#a1a4a5] text-sm">
            No completed deliveries in this period.
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2 text-[#a1a4a5] text-xs font-medium uppercase tracking-wider border-b border-[rgba(255,255,255,0.08)]">
              <span className="col-span-2">Tracking ID / Sender</span>
              <span>Recipient</span>
              <span>Route</span>
              <span>Payment</span>
              <span className="text-right">Fee</span>
              <span className="text-right">Date</span>
            </div>

            <ul className="divide-y divide-[rgba(255,255,255,0.08)]">
              {paginated.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[#f0f0f0] text-xs font-semibold">{d.id}</p>
                        <p className="text-[#f0f0f0] text-sm">{d.sender_name} → {d.recipient_name}</p>
                        <p className="text-[#a1a4a5] text-xs">{d.pickup_area} → {d.dropoff_area}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#f0f0f0] font-bold text-sm">{formatNaira(d.fee!)}</p>
                        <p className="text-[#a1a4a5] text-xs">{formatDate(d.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-[#a1a4a5] text-xs">{PAYMENT_LABELS[d.payment_method]}</span>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-7 gap-2 items-center text-sm">
                    <div className="col-span-2 min-w-0">
                      <p className="font-mono text-[#a1a4a5] text-xs truncate">{d.id}</p>
                      <p className="text-[#f0f0f0] truncate">{d.sender_name}</p>
                    </div>
                    <p className="text-[#a1a4a5] truncate">{d.recipient_name}</p>
                    <p className="text-[#a1a4a5] text-xs truncate">{d.pickup_area} → {d.dropoff_area}</p>
                    <p className="text-[#a1a4a5] text-xs">{PAYMENT_LABELS[d.payment_method]}</p>
                    <p className="text-[#f0f0f0] font-semibold text-right">{formatNaira(d.fee!)}</p>
                    <p className="text-[#a1a4a5] text-xs text-right">{formatDate(d.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-[rgba(255,255,255,0.08)] rounded-lg text-[#a1a4a5] hover:text-[#f0f0f0] disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-[#a1a4a5] text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-[rgba(255,255,255,0.08)] rounded-lg text-[#a1a4a5] hover:text-[#f0f0f0] disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
