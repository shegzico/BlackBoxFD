'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import DeliveryOverlay from '@/components/DeliveryOverlay';
import { Delivery } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

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

/* ------------------------------------------------------------------ */
/*  Banner Carousel                                                     */
/* ------------------------------------------------------------------ */

const bannerSlides = [
  {
    headline: 'Same-day motorcycle delivery',
    sub: 'Across Lagos — fast, reliable, trackable.',
    accent: 'across Lagos',
    bg: 'from-[#1a1a00] to-[#0A0A0A]',
  },
  {
    headline: 'Track every package in real-time',
    sub: 'Live updates from pickup to doorstep.',
    accent: 'real-time',
    bg: 'from-[#001a0a] to-[#0A0A0A]',
  },
  {
    headline: 'Bulk deliveries made easy',
    sub: 'Upload a CSV and dispatch multiple orders at once.',
    accent: 'made easy',
    bg: 'from-[#1a0a00] to-[#0A0A0A]',
  },
];

function Banner() {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % bannerSlides.length), []);

  useEffect(() => {
    timer.current = setInterval(next, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [next]);

  const slide = bannerSlides[current];

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${slide.bg} border border-[#2A2A2A] overflow-hidden transition-all duration-500`}>
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[#F2FF66]/5 pointer-events-none" />
      <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-[#F2FF66]/5 pointer-events-none" />

      <div className="px-5 py-6 md:py-8 md:px-8 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-[#F2FF66] text-[#0A0A0A] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
              BlackBox Logistics
            </span>
            <h2 className="text-lg md:text-2xl font-bold text-[#FAFAFA] leading-snug max-w-xs">
              {slide.headline}
            </h2>
            <p className="text-[#888888] text-sm mt-2 max-w-xs">{slide.sub}</p>
          </div>
          {/* Motorcycle icon */}
          <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl bg-[#F2FF66]/10 flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
              <circle cx="16" cy="48" r="8" stroke="#F2FF66" strokeWidth="3" fill="none"/>
              <circle cx="48" cy="48" r="8" stroke="#F2FF66" strokeWidth="3" fill="none"/>
              <path d="M24 48h16M16 40l8-16h12l8 8-4 8" stroke="#F2FF66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M36 24l4-8h8" stroke="#F2FF66" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Slide dots */}
        <div className="flex gap-1.5 mt-5">
          {bannerSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-[#F2FF66]' : 'w-1.5 bg-[#FAFAFA]/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Action Cards                                                  */
/* ------------------------------------------------------------------ */

const quickActions = [
  {
    href: '/customer/orders/create',
    label: 'Place Order',
    sub: 'Send a package',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    iconBg: 'bg-[#F2FF66]',
    iconColor: 'text-[#0A0A0A]',
  },
  {
    href: '/customer/orders',
    label: 'My Orders',
    sub: 'View all orders',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    iconBg: 'bg-[#232023]',
    iconColor: 'text-[#FAFAFA]',
  },
  {
    href: '/customer/track',
    label: 'Track Package',
    sub: 'Live delivery status',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    iconBg: 'bg-[#232023]',
    iconColor: 'text-[#FAFAFA]',
  },
  {
    href: '/customer/account',
    label: 'My Account',
    sub: 'Profile & settings',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    iconBg: 'bg-[#232023]',
    iconColor: 'text-[#FAFAFA]',
  },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center gap-2.5 bg-[#191314] border border-[#2A2A2A] rounded-xl p-3 md:p-4 hover:border-[#F2FF66]/30 active:scale-95 transition-all text-center"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.iconBg} ${action.iconColor}`}>
            {action.icon}
          </div>
          <div>
            <p className="text-[#FAFAFA] text-xs font-semibold leading-tight">{action.label}</p>
            <p className="text-[#888888] text-[10px] mt-0.5 leading-tight hidden md:block">{action.sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delivery Numbers Grid                                               */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[#888888] text-xs leading-tight">{label}</p>
        <p className="text-[#FAFAFA] text-xl font-bold mt-0.5">
          {loading ? <span className="inline-block w-6 h-5 bg-[#2A2A2A] rounded animate-pulse" /> : value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                      */
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

export default function CustomerDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, confirmed: 0, cancelled: 0 });
  const [recentOrders, setRecentOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [overlayTrackingId, setOverlayTrackingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30 | 0>(0);

  const fetchData = useCallback(async (days: number) => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`/api/customer/stats${days ? `?days=${days}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/customer/deliveries?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const list = Array.isArray(data) ? data : data.deliveries || [];
        setRecentOrders(sortRecentOrders(list));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
      setCustomerName(info.name?.split(' ')[0] || '');
    } catch { /**/ }

    fetchData(period);
    const interval = setInterval(() => fetchData(period), 30000);
    return () => clearInterval(interval);
  }, [fetchData, period]);

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
      accent: 'bg-amber-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Rider assigned',
      value: stats.assigned,
      accent: 'bg-blue-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      label: 'Picked up',
      value: stats.picked_up,
      accent: 'bg-purple-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>,
    },
    {
      label: 'In transit',
      value: stats.in_transit,
      accent: 'bg-orange-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    },
    {
      label: 'Delivered',
      value: stats.delivered,
      accent: 'bg-green-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Confirmed',
      value: stats.confirmed,
      accent: 'bg-[#F2FF66]/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#F2FF66]" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    },
    {
      label: 'Cancelled',
      value: stats.cancelled,
      accent: 'bg-red-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    },
    {
      label: 'Total shipments',
      value: stats.total,
      accent: 'bg-gray-500/10',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    },
  ];

  return (
    <div className="px-4 md:px-6 py-5 space-y-5 max-w-5xl mx-auto">

      {/* Greeting */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-[#FAFAFA]">
          {getGreeting()}{customerName ? `, ${customerName}` : ''} 👋
        </h1>
        <p className="text-[#888888] text-sm mt-0.5">Here&apos;s your delivery overview</p>
      </div>

      {/* Banner */}
      <Banner />

      {/* Quick Actions */}
      <QuickActions />

      {/* Delivery Numbers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Delivery numbers</h2>
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-[#191314] border border-[#2A2A2A] rounded-lg p-1">
            {([7, 30, 0] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setPeriod(d); setLoading(true); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === d
                    ? 'bg-[#F2FF66] text-[#0A0A0A]'
                    : 'text-[#888888] hover:text-[#FAFAFA]'
                }`}
              >
                {d === 7 ? '7 days' : d === 30 ? '30 days' : 'All time'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Recent orders</h2>
          <Link href="/customer/orders" className="text-[#F2FF66] text-xs font-medium hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl h-[68px] animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <p className="text-[#888888] text-sm">No orders yet</p>
            <Link href="/customer/orders/create" className="inline-block mt-3 text-[#F2FF66] text-sm font-medium hover:underline">
              Place your first order →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setOverlayTrackingId(order.id)}
                className="w-full bg-[#191314] border border-[#2A2A2A] rounded-xl px-4 py-3 text-left hover:border-[#F2FF66]/20 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#F2FF66] truncate">{order.id}</p>
                    <p className="text-sm text-[#FAFAFA] mt-0.5 truncate">
                      {order.pickup_area} → {order.dropoff_area}
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">
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

      {/* Delivery Detail Overlay */}
      <DeliveryOverlay
        trackingId={overlayTrackingId}
        onClose={() => setOverlayTrackingId(null)}
      />
    </div>
  );
}
