'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import DeliveryOverlay from '@/components/DeliveryOverlay';
import { Delivery, DeliveryStatus, STATUS_LABELS } from '@/lib/types';

/* ---- Draft order type (from /api/orders) ---- */
interface DraftOrder {
  id: number;
  order_number: string;
  pickup_area: string;
  pickup_address: string;
  pickup_date: string | null;
  delivery_count: number;
  total_fee: number | null;
  created_at: string;
  updated_at: string;
}

const STATUS_FILTERS: (DeliveryStatus | 'all')[] = ['all', 'pending', 'assigned', 'in_transit', 'delivered', 'confirmed'];

interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  completedDeliveries: number;
  canceled: number;
}

function computeStats(orders: Delivery[]): OrderStats {
  const completedDeliveries = orders.filter(o => o.status === 'delivered' || o.status === 'confirmed').length;
  // For now each delivery = 1 order. When multi-delivery orders exist, group by batch.
  return {
    totalOrders: orders.length,
    completedOrders: orders.filter(o => o.status === 'confirmed').length,
    completedDeliveries,
    canceled: 0, // No canceled status yet — reserved for future
  };
}

// Sort active (non-delivered/confirmed) by pickup_date ASC then created_at DESC, completed at bottom
function sortOrders(orders: Delivery[]): Delivery[] {
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

export default function CustomerOrders() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Delivery[]>([]);
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overlayTrackingId, setOverlayTrackingId] = useState<string | null>(null);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    try {
      // Fetch deliveries for the orders list
      const [deliveriesRes, ordersRes] = await Promise.all([
        fetch('/api/customer/deliveries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        const list = Array.isArray(data) ? data : data.deliveries || [];
        setAllOrders(list);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const allOrdersList: DraftOrder[] = Array.isArray(data) ? data : data.orders || [];
        setDrafts(allOrdersList.filter((o) => o.id && (o as unknown as { is_draft: boolean }).is_draft));
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // Client-side filtering + sorting
  useEffect(() => {
    let filtered = [...allOrders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search filter
    const q = search.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.recipient_name.toLowerCase().includes(q) ||
        o.recipient_phone.includes(q)
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(o => new Date(o.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => new Date(o.created_at) <= to);
    }

    // Sort active first, then completed
    setOrders(sortOrders(filtered));
  }, [allOrders, statusFilter, search, dateFrom, dateTo]);

  const stats = computeStats(allOrders);

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, color: 'text-[#F2FF66]' },
    { label: 'Completed Orders', value: stats.completedOrders, color: 'text-green-400' },
    { label: 'Completed Deliveries', value: stats.completedDeliveries, color: 'text-emerald-400' },
    { label: 'Canceled', value: stats.canceled, color: 'text-red-400' },
  ];

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#FAFAFA]">My Orders</h1>
        <Link
          href="/customer/orders/create"
          className="bg-[#F2FF66] text-[#0A0A0A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors"
        >
          + Create Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-3 md:p-4">
            <p className="text-[#888888] text-[10px] md:text-xs font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-xl md:text-2xl font-bold mt-1 ${card.color}`}>
              {loading ? '-' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">{'\u{1F50D}'}</span>
          <input
            type="text"
            placeholder="Search by tracking ID or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#191314] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#888888] focus:outline-none focus:border-[#F2FF66]/40"
          />
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#191314] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]/40 [color-scheme:dark]"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#191314] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]/40 [color-scheme:dark]"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[#888888] hover:text-[#FAFAFA] text-xs px-2 border border-[#2A2A2A] rounded-lg transition-colors"
              title="Clear dates"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wider">Drafts</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              {drafts.length}
            </span>
          </div>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.order_number}
                className="bg-[#191314] border border-amber-500/20 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-[#F2FF66]">{draft.order_number}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-medium">
                      Draft
                    </span>
                  </div>
                  <p className="text-sm text-[#FAFAFA] truncate">
                    {draft.pickup_area} · {draft.delivery_count} deliver{draft.delivery_count === 1 ? 'y' : 'ies'}
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">
                    {draft.pickup_date
                      ? new Date(draft.pickup_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                      : `Saved ${new Date(draft.updated_at || draft.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                    {draft.total_fee != null && ` · ₦${draft.total_fee.toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/customer/orders/create?draft=${draft.order_number}`)}
                    className="flex items-center gap-1.5 bg-[#F2FF66] text-[#0A0A0A] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#e8f55c] transition-colors active:scale-95"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this draft?')) return;
                      setDeletingDraft(draft.order_number);
                      const token = localStorage.getItem('customer_token');
                      try {
                        await fetch(`/api/orders/${draft.order_number}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token || ''}` },
                        });
                        setDrafts((prev) => prev.filter((d) => d.order_number !== draft.order_number));
                      } finally {
                        setDeletingDraft(null);
                      }
                    }}
                    disabled={deletingDraft === draft.order_number}
                    className="text-[#888888] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete draft"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#2A2A2A] pt-2" />
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          const label = status === 'all' ? 'All' : STATUS_LABELS[status];
          const count = status === 'all' ? allOrders.length : allOrders.filter(o => o.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${isActive
                  ? 'bg-[#F2FF66]/10 text-[#F2FF66] border border-[#F2FF66]/20'
                  : 'bg-[#191314] text-[#888888] border border-[#2A2A2A] hover:text-[#FAFAFA]'
                }
              `}
            >
              {label}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-[#888888] text-xs">
        Showing {orders.length} of {allOrders.length} orders
      </p>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">{'\u{1F4E6}'}</p>
          <p className="text-[#FAFAFA] font-medium">No orders found</p>
          <p className="text-[#888888] text-sm mt-1">
            {allOrders.length === 0 ? 'Your delivery history will appear here' : 'Try adjusting your filters'}
          </p>
          {allOrders.length === 0 && (
            <Link
              href="/customer/orders/create"
              className="inline-block mt-4 bg-[#F2FF66] text-[#0A0A0A] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors"
            >
              Create Your First Order
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#F2FF66]/20 transition-colors"
            >
              <button
                onClick={() => setOverlayTrackingId(order.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#F2FF66] truncate">{order.id}</p>
                    <p className="text-sm text-[#FAFAFA] mt-1">
                      {order.pickup_area} {'\u2192'} {order.dropoff_area}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-xs text-[#888888]">{order.recipient_name}</p>
                      <span className="text-[#2A2A2A]">|</span>
                      <p className="text-xs text-[#888888]">
                        {order.pickup_date
                          ? new Date(order.pickup_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                          : new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </p>
                      {order.fee != null && (
                        <>
                          <span className="text-[#2A2A2A]">|</span>
                          <p className="text-xs text-[#888888]">{'\u20A6'}{order.fee.toLocaleString()}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </button>

              {/* Cancel button — only for pending orders */}
              {order.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex justify-end">
                  <button
                    onClick={async () => {
                      if (!window.confirm('Cancel this order? This cannot be undone.')) return;
                      setCancelingOrder(order.id);
                      const token = localStorage.getItem('customer_token');
                      try {
                        const res = await fetch(`/api/deliveries/${order.id}/cancel`, {
                          method: 'PATCH',
                          headers: { Authorization: `Bearer ${token || ''}` },
                        });
                        if (res.ok) {
                          setAllOrders((prev) =>
                            prev.map((o) => o.id === order.id ? { ...o, status: 'cancelled' as DeliveryStatus } : o)
                          );
                        }
                      } finally {
                        setCancelingOrder(null);
                      }
                    }}
                    disabled={cancelingOrder === order.id}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800/40 hover:border-red-600/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {cancelingOrder === order.id ? 'Canceling…' : 'Cancel Order'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Create Button (mobile) */}
      <Link
        href="/customer/orders/create"
        className="md:hidden fixed right-4 bottom-20 z-40 bg-[#F2FF66] text-[#0A0A0A] w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-[#E5F25E] transition-colors active:scale-95"
        aria-label="Create Order"
      >
        +
      </Link>

      {/* Delivery Detail Overlay */}
      <DeliveryOverlay
        trackingId={overlayTrackingId}
        onClose={() => setOverlayTrackingId(null)}
      />
    </div>
  );
}
