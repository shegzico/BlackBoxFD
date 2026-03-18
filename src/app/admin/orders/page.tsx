'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import {
  Delivery,
  DeliveryStatus,
  Rider,
  STATUS_LABELS,
  PaymentMethod,
  PAYMENT_LABELS,
  ALL_ZONES,
} from '@/lib/types';

const FILTER_TABS: { label: string; value: DeliveryStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Confirmed', value: 'confirmed' },
];

function formatNaira(amount: number | null): string {
  if (amount == null) return '—';
  return '₦' + amount.toLocaleString('en-NG');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EMPTY_FORM = {
  sender_name: '',
  sender_phone: '',
  pickup_area: '',
  pickup_address: '',
  recipient_name: '',
  recipient_phone: '',
  dropoff_area: '',
  dropoff_address: '',
  package_description: '',
  payment_method: 'transfer' as PaymentMethod,
  is_express: false,
  fee: '',
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [riders, setRiders] = useState<Rider[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [feeMap, setFeeMap] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Delivery | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/admin');
    return token;
  }, [router]);

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/deliveries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : (data.deliveries ?? []));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchRiders = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/riders?active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRiders(Array.isArray(data) ? data : (data.riders ?? []));
    } catch {
      // silent
    }
  }, [getToken]);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [fetchOrders, fetchRiders]);

  const filtered = orders.filter((o) => {
    const matchesStatus = filter === 'all' || o.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.sender_name.toLowerCase().includes(q) ||
      o.sender_phone.includes(q) ||
      o.recipient_name.toLowerCase().includes(q) ||
      o.recipient_phone.includes(q);
    return matchesStatus && matchesSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  async function handleAssign(orderId: string) {
    const token = getToken();
    if (!token) return;
    const riderId = assignMap[orderId];
    if (!riderId) return;
    setActionLoading(`assign-${orderId}`);
    try {
      await fetch(`/api/deliveries/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rider_id: parseInt(riderId), triggered_by: 'admin', status: 'assigned' }),
      });
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSetFee(orderId: string) {
    const token = getToken();
    if (!token) return;
    const fee = parseFloat(feeMap[orderId]);
    if (isNaN(fee)) return;
    setActionLoading(`fee-${orderId}`);
    try {
      await fetch(`/api/deliveries/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fee, triggered_by: 'admin' }),
      });
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!window.confirm('Cancel this order? This action cannot be undone.')) return;
    const token = getToken();
    if (!token) return;
    setActionLoading(`cancel-${orderId}`);
    try {
      await fetch(`/api/deliveries/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchOrders();
      setExpandedId(null);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      const body = {
        ...createForm,
        fee: createForm.fee ? parseFloat(createForm.fee) : null,
        created_by: 'admin',
      };
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error || 'Failed to create order.');
        return;
      }
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
      await fetchOrders();
    } catch {
      setCreateError('Network error.');
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(order: Delivery) {
    setEditTarget(order);
    setEditForm({
      sender_name: order.sender_name,
      sender_phone: order.sender_phone,
      pickup_area: order.pickup_area,
      pickup_address: order.pickup_address,
      recipient_name: order.recipient_name,
      recipient_phone: order.recipient_phone,
      dropoff_area: order.dropoff_area,
      dropoff_address: order.dropoff_address,
      package_description: order.package_description ?? '',
      payment_method: order.payment_method,
      is_express: order.is_express,
      fee: order.fee?.toString() ?? '',
    });
    setEditError('');
    setShowEditModal(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const token = getToken();
    if (!token) return;
    setEditLoading(true);
    setEditError('');
    try {
      const body = {
        ...editForm,
        fee: editForm.fee ? parseFloat(editForm.fee) : null,
        triggered_by: 'admin',
      };
      const res = await fetch(`/api/deliveries/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error || 'Failed to update order.');
        return;
      }
      setShowEditModal(false);
      setEditTarget(null);
      await fetchOrders();
    } catch {
      setEditError('Network error.');
    } finally {
      setEditLoading(false);
    }
  }

  const inputCls = `
    w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg
    px-3 py-2.5 text-[#FAFAFA] text-sm placeholder:text-[#888888]
    focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66]/20
    transition-colors
  `;
  const labelCls = 'text-[#888888] text-xs font-medium uppercase tracking-wider mb-1';

  function OrderForm({
    form,
    setForm,
    onSubmit,
    loading: fLoading,
    error: fError,
    submitLabel,
  }: {
    form: typeof EMPTY_FORM;
    setForm: (f: typeof EMPTY_FORM) => void;
    onSubmit: (e: React.FormEvent) => void;
    loading: boolean;
    error: string;
    submitLabel: string;
  }) {
    const update = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
      setForm({ ...form, [k]: v });

    return (
      <form onSubmit={onSubmit} className="space-y-3">
        {fError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{fError}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Sender Name</p>
            <input className={inputCls} value={form.sender_name} onChange={(e) => update('sender_name', e.target.value)} required placeholder="John Doe" />
          </div>
          <div>
            <p className={labelCls}>Sender Phone</p>
            <input className={inputCls} value={form.sender_phone} onChange={(e) => update('sender_phone', e.target.value)} required placeholder="08012345678" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Pickup Area</p>
            <select className={inputCls} value={form.pickup_area} onChange={(e) => update('pickup_area', e.target.value)} required>
              <option value="">Select area</option>
              {ALL_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <p className={labelCls}>Pickup Address</p>
            <input className={inputCls} value={form.pickup_address} onChange={(e) => update('pickup_address', e.target.value)} required placeholder="12 Main St" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Recipient Name</p>
            <input className={inputCls} value={form.recipient_name} onChange={(e) => update('recipient_name', e.target.value)} required placeholder="Jane Doe" />
          </div>
          <div>
            <p className={labelCls}>Recipient Phone</p>
            <input className={inputCls} value={form.recipient_phone} onChange={(e) => update('recipient_phone', e.target.value)} required placeholder="08098765432" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Dropoff Area</p>
            <select className={inputCls} value={form.dropoff_area} onChange={(e) => update('dropoff_area', e.target.value)} required>
              <option value="">Select area</option>
              {ALL_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <p className={labelCls}>Dropoff Address</p>
            <input className={inputCls} value={form.dropoff_address} onChange={(e) => update('dropoff_address', e.target.value)} required placeholder="45 Ocean Dr" />
          </div>
        </div>
        <div>
          <p className={labelCls}>Package Description</p>
          <input className={inputCls} value={form.package_description} onChange={(e) => update('package_description', e.target.value)} placeholder="Documents, electronics..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Payment Method</p>
            <select className={inputCls} value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
              {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <p className={labelCls}>Fee (₦)</p>
            <input className={inputCls} type="number" value={form.fee} onChange={(e) => update('fee', e.target.value)} placeholder="0.00" min="0" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_express}
            onChange={(e) => update('is_express', e.target.checked)}
            className="w-4 h-4 accent-[#F2FF66]"
          />
          <span className="text-[#888888] text-sm">Express delivery</span>
        </label>
        <button
          type="submit"
          disabled={fLoading}
          className="w-full bg-[#F2FF66] text-[#0A0A0A] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fLoading ? 'Saving...' : submitLabel}
        </button>
      </form>
    );
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#FAFAFA]">Orders</h1>
        <button
          onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateForm(EMPTY_FORM); }}
          className="bg-[#F2FF66] text-[#0A0A0A] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e8f55c] active:scale-95 transition-all"
        >
          + Create Order
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">🔍</span>
        <input
          className="w-full bg-[#191314] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 text-[#FAFAFA] text-sm placeholder:text-[#888888] focus:outline-none focus:border-[#F2FF66] transition-colors"
          placeholder="Search by tracking ID, name, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value); setPage(1); }}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${filter === tab.value
                ? 'bg-[#F2FF66] text-[#0A0A0A]'
                : 'bg-[#191314] border border-[#2A2A2A] text-[#888888] hover:text-[#FAFAFA]'
              }
            `}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1 opacity-60">
                {orders.filter((o) => o.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-[#888888] text-xs">
        Showing {paginated.length} of {filtered.length} orders
      </p>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 space-y-2 animate-pulse">
              <div className="w-40 h-4 bg-[#2A2A2A] rounded" />
              <div className="w-64 h-3 bg-[#2A2A2A] rounded" />
              <div className="w-32 h-3 bg-[#2A2A2A] rounded" />
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-16 text-center text-[#888888] text-sm">
          No orders found
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="bg-[#191314] border border-[#2A2A2A] rounded-xl overflow-hidden">
                {/* Card Header */}
                <button
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[#F2FF66] text-sm font-semibold">{order.id}</span>
                      {order.is_express && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-medium">EXPRESS</span>
                      )}
                    </div>
                    <p className="text-[#FAFAFA] text-sm mt-0.5">
                      {order.sender_name} → {order.recipient_name}
                    </p>
                    <p className="text-[#888888] text-xs mt-0.5">
                      {order.pickup_area} → {order.dropoff_area}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={order.status} />
                    <span className="text-[#888888] text-xs">{formatNaira(order.fee)}</span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#2A2A2A] space-y-3">
                    <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                      <div>
                        <p className="text-[#888888] mb-0.5">Sender</p>
                        <p className="text-[#FAFAFA]">{order.sender_name}</p>
                        <p className="text-[#888888]">{order.sender_phone}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Recipient</p>
                        <p className="text-[#FAFAFA]">{order.recipient_name}</p>
                        <p className="text-[#888888]">{order.recipient_phone}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Pickup</p>
                        <p className="text-[#FAFAFA]">{order.pickup_address}</p>
                        <p className="text-[#888888]">{order.pickup_area}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Dropoff</p>
                        <p className="text-[#FAFAFA]">{order.dropoff_address}</p>
                        <p className="text-[#888888]">{order.dropoff_area}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Payment</p>
                        <p className="text-[#FAFAFA]">{PAYMENT_LABELS[order.payment_method]}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Rider</p>
                        <p className="text-[#FAFAFA]">{order.rider?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Created</p>
                        <p className="text-[#FAFAFA]">{formatDate(order.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-[#888888] mb-0.5">Source</p>
                        <p className="text-[#FAFAFA] capitalize">{order.created_by}</p>
                      </div>
                    </div>

                    {order.package_description && (
                      <div className="text-xs">
                        <p className="text-[#888888] mb-0.5">Package</p>
                        <p className="text-[#FAFAFA]">{order.package_description}</p>
                      </div>
                    )}

                    {/* Assign Rider (pending/unassigned) */}
                    {(order.status === 'pending' || !order.rider_id) && (
                      <div className="flex gap-2 pt-1">
                        <select
                          className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]"
                          value={assignMap[order.id] ?? ''}
                          onChange={(e) => setAssignMap((m) => ({ ...m, [order.id]: e.target.value }))}
                        >
                          <option value="">Assign rider...</option>
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} — {r.phone}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(order.id)}
                          disabled={!assignMap[order.id] || actionLoading === `assign-${order.id}`}
                          className="bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `assign-${order.id}` ? '...' : 'Assign'}
                        </button>
                      </div>
                    )}

                    {/* Set Fee */}
                    {order.fee == null && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Set fee (₦)"
                          className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#888888] focus:outline-none focus:border-[#F2FF66]"
                          value={feeMap[order.id] ?? ''}
                          onChange={(e) => setFeeMap((m) => ({ ...m, [order.id]: e.target.value }))}
                          min="0"
                        />
                        <button
                          onClick={() => handleSetFee(order.id)}
                          disabled={!feeMap[order.id] || actionLoading === `fee-${order.id}`}
                          className="bg-[#F2FF66] text-[#0A0A0A] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `fee-${order.id}` ? '...' : 'Set'}
                        </button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEdit(order)}
                        className="flex-1 border border-[#2A2A2A] text-[#888888] hover:text-[#FAFAFA] hover:border-[#F2FF66] text-sm py-2 rounded-lg transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={actionLoading === `cancel-${order.id}`}
                        className="flex-1 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `cancel-${order.id}` ? '...' : '🗑️ Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-[#2A2A2A] rounded-lg text-[#888888] hover:text-[#FAFAFA] disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-[#888888] text-sm">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-[#2A2A2A] rounded-lg text-[#888888] hover:text-[#FAFAFA] disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg bg-[#191314] border border-[#2A2A2A] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#191314] z-10">
              <h2 className="text-[#FAFAFA] font-bold">Create New Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#888888] hover:text-[#FAFAFA] text-xl leading-none">&times;</button>
            </div>
            <div className="p-5">
              <OrderForm
                form={createForm}
                setForm={setCreateForm}
                onSubmit={handleCreate}
                loading={createLoading}
                error={createError}
                submitLabel="Create Order"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg bg-[#191314] border border-[#2A2A2A] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#191314] z-10">
              <div>
                <h2 className="text-[#FAFAFA] font-bold">Edit Order</h2>
                <p className="text-[#888888] text-xs font-mono">{editTarget.id}</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditTarget(null); }} className="text-[#888888] hover:text-[#FAFAFA] text-xl leading-none">&times;</button>
            </div>
            <div className="p-5">
              <OrderForm
                form={editForm}
                setForm={setEditForm}
                onSubmit={handleEdit}
                loading={editLoading}
                error={editError}
                submitLabel="Save Changes"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
