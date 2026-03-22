'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import DeliveryOverlay from '@/components/DeliveryOverlay';
import { Delivery } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Calendar, ArrowDown2, TickCircle, Add, Location, Clock, InfoCircle, TruckFast, ArrowRotateLeft, Refresh2, Grid4, Box } from 'iconsax-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Stats {
  total: number;
  pending: number;
  assigned: number;
  picked_up: number;
  in_transit: number;
  delivered: number;
  confirmed: number;
  cancelled: number;
}

type PeriodKey = 'last7' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface Period {
  key: PeriodKey;
  label: string;
}

const PERIODS: Period[] = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'lastYear', label: 'Last year' },
  { key: 'custom', label: 'Custom' },
];

function getDateRange(key: PeriodKey): { from: string; to: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (key === 'last7') {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: fmt(from), to: fmt(now) };
  }
  if (key === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (key === 'thisYear') {
    return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
  }
  if (key === 'lastYear') {
    const y = now.getFullYear() - 1;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  return null; // custom — caller provides range
}

/* ------------------------------------------------------------------ */
/*  Period Dropdown                                                      */
/* ------------------------------------------------------------------ */

function PeriodDropdown({
  selected,
  onChange,
  customFrom,
  customTo,
  onCustomChange,
}: {
  selected: PeriodKey;
  onChange: (key: PeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = PERIODS.find((p) => p.key === selected)?.label ?? 'All time';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] hover:border-[#212629] text-[#f0f0f0] text-xs font-medium px-3 py-2 rounded-lg transition-colors"
      >
        <Calendar size={14} color="#a1a4a5" />
        {selectedLabel}
        <ArrowDown2 size={12} color="#a1a4a5" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-xl z-30 overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => { onChange(p.key); if (p.key !== 'custom') setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                selected === p.key
                  ? 'bg-[#18191ce0] text-[#f0f0f0]'
                  : 'text-[#a1a4a5] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f0f0f0]'
              }`}
            >
              {p.label}
              {selected === p.key && (
                <TickCircle size={14} color="currentColor" variant="Bold" />
              )}
            </button>
          ))}

          {/* Custom date range inputs */}
          {selected === 'custom' && (
            <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-3 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a4a5] uppercase tracking-wider">From</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => onCustomChange(e.target.value, customTo)}
                  className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#212629] [color-scheme:dark]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a4a5] uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => onCustomChange(customFrom, e.target.value)}
                  className="bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#212629] [color-scheme:dark]"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={!customFrom || !customTo}
                className="mt-1 w-full bg-[#F2FF66] text-[#000000] text-xs font-semibold py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Banner Carousel                                                     */
/* ------------------------------------------------------------------ */

const bannerSlides = [
  {
    headline: 'Same-day motorcycle delivery across Lagos',
    sub: 'Fast, reliable, and fully trackable.',
    bg: 'from-[#1a1a00] to-[#0f0f00]',
  },
  {
    headline: 'Track every package in real-time',
    sub: 'Live updates from pickup to doorstep.',
    bg: 'from-[#001a0a] to-[#000f07]',
  },
  {
    headline: 'Bulk deliveries, zero hassle',
    sub: 'Upload a CSV and dispatch multiple orders at once.',
    bg: 'from-[#1a0800] to-[#0f0500]',
  },
];

function Banner() {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const next = useCallback(() => setCurrent((c) => (c + 1) % bannerSlides.length), []);

  useEffect(() => {
    timer.current = setInterval(next, 4500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [next]);

  return (
    <div className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden h-36 md:h-44">
      {bannerSlides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-br ${slide.bg} flex items-center px-5 md:px-8 transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Decorative rings */}
          <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-[#F2FF66]/5 pointer-events-none" />
          <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full bg-[#F2FF66]/5 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between w-full gap-4">
            <div>
              <span className="inline-block bg-[#F2FF66] text-[#000000] text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                BlackBox Logistics
              </span>
              <h2 className="text-base md:text-xl font-bold text-[#f0f0f0] leading-snug max-w-xs">
                {slide.headline}
              </h2>
              <p className="text-[#a1a4a5] text-xs md:text-sm mt-1.5">{slide.sub}</p>
            </div>

            <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F2FF66]/10 flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
                <circle cx="16" cy="48" r="8" stroke="#F2FF66" strokeWidth="3"/>
                <circle cx="48" cy="48" r="8" stroke="#F2FF66" strokeWidth="3"/>
                <path d="M24 48h16M16 40l8-16h12l8 8-4 8" stroke="#F2FF66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M36 24l4-8h8" stroke="#F2FF66" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-5 md:left-8 flex gap-1.5 z-10">
        {bannerSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-5 bg-[#F2FF66]' : 'w-1.5 bg-[#f0f0f0]/25'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Action Cards                                                  */
/* ------------------------------------------------------------------ */

function QuickActions() {
  const actions = [
    {
      href: '/customer/orders/create',
      label: 'Place Order',
      sub: 'Send a package',
      iconBg: 'bg-[#F2FF66]',
      iconColor: 'text-[#000000]',
      icon: <Add size={20} color="currentColor" />,
    },
    {
      href: '/customer/track',
      label: 'Track Package',
      sub: 'Live status',
      iconBg: 'bg-[#232023]',
      iconColor: 'text-[#f0f0f0]',
      icon: <Location size={20} color="currentColor" />,
    },
    {
      href: '/customer/orders?filter=pending',
      label: 'Pending Orders',
      sub: 'View pending',
      iconBg: 'bg-[#232023]',
      iconColor: 'text-[#f0f0f0]',
      icon: <Clock size={20} color="currentColor" />,
    },
    {
      href: '/customer/support',
      label: 'Raise a Concern',
      sub: 'Get help',
      iconBg: 'bg-[#232023]',
      iconColor: 'text-[#f0f0f0]',
      disabled: true,
      icon: <InfoCircle size={20} color="currentColor" />,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => {
        const inner = (
          <>
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center ${action.iconBg} ${action.iconColor}`}>
              {action.icon}
            </div>
            <div>
              <p className="text-[#f0f0f0] text-[11px] md:text-xs font-semibold leading-tight">{action.label}</p>
              <p className="text-[#a1a4a5] text-[10px] mt-0.5 leading-tight hidden md:block">{action.sub}</p>
            </div>
          </>
        );

        if (action.disabled) {
          return (
            <div
              key={action.label}
              className="flex flex-col items-center gap-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 md:p-4 text-center opacity-60 cursor-not-allowed relative"
              title="Coming soon"
            >
              {inner}
              <span className="absolute top-1.5 right-1.5 text-[8px] bg-[rgba(255,255,255,0.08)] text-[#a1a4a5] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide hidden md:block">
                Soon
              </span>
            </div>
          );
        }

        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 md:p-4 hover:border-[#212629] active:scale-95 transition-all text-center"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, accent, loading }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3.5 flex items-center gap-3 border border-[rgba(255,255,255,0.08)]"
      style={{ background: 'linear-gradient(rgba(80,80,80,0.10) 0%, rgba(0,0,0,0) 70%)' }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[#a1a4a5] text-[11px] leading-tight">{label}</p>
        <p className="text-[#f0f0f0] text-xl font-bold mt-0.5">
          {loading ? <span className="inline-block w-6 h-5 bg-[rgba(255,255,255,0.08)] rounded animate-pulse align-middle" /> : value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function sortRecentOrders(orders: Delivery[]): Delivery[] {
  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'confirmed' && o.status !== 'cancelled');
  const rest = orders.filter((o) => o.status === 'delivered' || o.status === 'confirmed' || o.status === 'cancelled');
  active.sort((a, b) => {
    if (a.pickup_date && b.pickup_date) return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
    if (a.pickup_date) return -1;
    if (b.pickup_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  rest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return [...active, ...rest];
}

function buildStatsUrl(period: PeriodKey, customFrom: string, customTo: string): string {
  const base = '/api/customer/stats';
  if (period === 'custom') {
    if (!customFrom || !customTo) return base;
    return `${base}?from=${customFrom}&to=${customTo}`;
  }
  const range = getDateRange(period);
  if (!range) return base;
  return `${base}?from=${range.from}&to=${range.to}`;
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                      */
/* ------------------------------------------------------------------ */

export default function CustomerDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, confirmed: 0, cancelled: 0 });
  const [recentOrders, setRecentOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [overlayTrackingId, setOverlayTrackingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('last7');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchStats = useCallback(async (p: PeriodKey, from: string, to: string) => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    setLoading(true);
    try {
      const url = buildStatsUrl(p, from, to);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch { /**/ } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    try {
      const res = await fetch('/api/customer/deliveries?limit=5', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRecentOrders(sortRecentOrders(Array.isArray(data) ? data : data.deliveries || []));
      }
    } catch { /**/ }
  }, []);

  useEffect(() => {
    try {
      const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
      // Business accounts: show business name; individuals: show first name
      if (info.business_name) {
        setCustomerName(info.business_name);
      } else {
        setCustomerName(info.name?.split(' ')[0] || '');
      }
    } catch { /**/ }
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (period === 'custom' && (!customFrom || !customTo)) return;
    fetchStats(period, customFrom, customTo);
  }, [period, customFrom, customTo, fetchStats]);

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  const statCards = [
    {
      label: 'Pending pickup',
      value: stats.pending,
      accent: 'bg-[rgba(150,105,35,0.12)]',
      icon: <Clock size={20} color="currentColor" />,
    },
    {
      label: 'Picked up items',
      value: stats.picked_up,
      accent: 'bg-[rgba(110,85,160,0.12)]',
      icon: <Box size={20} color="currentColor" />,
    },
    {
      label: 'Prepared for delivery',
      value: stats.assigned,
      accent: 'bg-[rgba(65,100,155,0.12)]',
      icon: <TickCircle size={20} color="currentColor" />,
    },
    {
      label: 'Delivery in progress',
      value: stats.in_transit,
      accent: 'bg-[rgba(145,80,35,0.12)]',
      icon: <TruckFast size={20} color="currentColor" />,
    },
    {
      label: 'Delivered items',
      value: stats.delivered + stats.confirmed,
      accent: 'bg-[rgba(38,100,58,0.12)]',
      icon: <TickCircle size={20} color="currentColor" />,
    },
    {
      label: 'In transit back to you',
      value: 0,
      accent: 'bg-[rgba(50,110,145,0.12)]',
      icon: <ArrowRotateLeft size={20} color="currentColor" />,
    },
    {
      label: 'Returned items',
      value: 0,
      accent: 'bg-[rgba(135,55,55,0.12)]',
      icon: <Refresh2 size={20} color="currentColor" />,
    },
    {
      label: 'Total shipment',
      value: stats.total,
      accent: 'bg-[#F2FF66]/8',
      icon: <Grid4 size={20} color="currentColor" />,
    },
  ];

  return (
    <div className="px-4 md:px-6 py-5 space-y-5 max-w-5xl mx-auto">

      {/* Greeting */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-[#f0f0f0]">
          {getGreeting()}{customerName ? `, ${customerName}` : ''} 👋
        </h1>
        {(() => {
          try {
            const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
            if (info.business_name) {
              return <p className="text-[#a1a4a5] text-sm mt-0.5">Here&apos;s your business delivery overview</p>;
            }
          } catch { /**/ }
          return <p className="text-[#a1a4a5] text-sm mt-0.5">Here&apos;s your delivery overview</p>;
        })()}
      </div>

      {/* Banner */}
      <Banner />

      {/* Quick Actions */}
      <QuickActions />

      {/* Delivery Numbers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#f0f0f0]">Delivery numbers</h2>
          <PeriodDropdown
            selected={period}
            onChange={setPeriod}
            customFrom={customFrom}
            customTo={customTo}
            onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              accent={card.accent}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#f0f0f0]">Recent orders</h2>
          <Link href="/customer/orders" className="text-[#a1a4a5] text-xs font-medium hover:text-[#f0f0f0] hover:underline">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
            <p className="text-[#a1a4a5] text-sm">No orders yet</p>
            <Link href="/customer/orders/create" className="inline-block mt-3 text-[#a1a4a5] text-sm font-medium hover:text-[#f0f0f0] hover:underline">
              Place your first order →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setOverlayTrackingId(order.id)}
                className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-left hover:border-[#212629] active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#a1a4a5] truncate">{order.id}</p>
                    <p className="text-sm text-[#f0f0f0] mt-0.5 truncate">
                      {order.pickup_area} → {order.dropoff_area}
                    </p>
                    <p className="text-xs text-[#a1a4a5] mt-0.5">
                      {new Date(order.pickup_date || order.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
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

      <DeliveryOverlay
        trackingId={overlayTrackingId}
        onClose={() => setOverlayTrackingId(null)}
      />
    </div>
  );
}
