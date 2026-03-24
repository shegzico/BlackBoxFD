'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import AddressInput from '@/components/AddressInput';
import {
  Delivery,
  DeliveryStatus,
  Rider,
  STATUS_LABELS,
  PaymentMethod,
  PAYMENT_LABELS,
  LAGOS_ZONES,
  PricingEntry,
  isValidNigerianPhone,
} from '@/lib/types';

const FILTER_TABS: { label: string; value: DeliveryStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Failed', value: 'delivery_failed' },
  { label: 'Returning', value: 'returning' },
  { label: 'Returned', value: 'returned' },
  { label: 'Cancelled', value: 'cancelled' },
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
  sender_email: '',
  pickup_area: '',
  pickup_address: '',
  recipient_name: '',
  recipient_phone: '',
  dropoff_area: '',
  dropoff_address: '',
  package_description: '',
  payment_method: 'sender_pays' as PaymentMethod,
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
  const [pricing, setPricing] = useState<PricingEntry[]>([]);
  const [phoneErrors, setPhoneErrors] = useState<{ sender?: string; recipient?: string }>({});
  const PAGE_SIZE = 20;

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
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

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch('/api/pricing?active=true');
      const data = await res.json();
      setPricing(data.pricing || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
    fetchPricing();
  }, [fetchOrders, fetchRiders, fetchPricing]);

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
      const order = orders.find((o) => o.id === orderId);
      const body: Record<string, unknown> = {
        rider_id: parseInt(riderId),
        triggered_by: 'admin',
        note: order?.rider_id ? 'Rider reassigned by admin' : undefined,
      };
      // Only set status to 'assigned' if currently pending
      if (!order || order.status === 'pending') {
        body.status = 'assigned';
      }
      await fetch(`/api/deliveries/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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

  async function handleStatusChange(orderId: string, newStatus: DeliveryStatus) {
    if (!window.confirm(`Change status to "${STATUS_LABELS[newStatus]}"?`)) return;
    const token = getToken();
    if (!token) return;
    setActionLoading(`status-${orderId}`);
    try {
      await fetch(`/api/deliveries/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, triggered_by: 'admin', note: 'Status changed by admin' }),
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

    // Validate phones
    const pErrors: { sender?: string; recipient?: string } = {};
    if (createForm.sender_phone && !isValidNigerianPhone(createForm.sender_phone)) {
      pErrors.sender = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    if (createForm.recipient_phone && !isValidNigerianPhone(createForm.recipient_phone)) {
      pErrors.recipient = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    setPhoneErrors(pErrors);
    if (pErrors.sender || pErrors.recipient) return;

    setCreateLoading(true);
    setCreateError('');
    try {
      const body = {
        ...createForm,
        sender_email: createForm.sender_email || undefined,
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
      sender_email: order.sender_email ?? '',
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

    // Validate phones
    const pErrors: { sender?: string; recipient?: string } = {};
    if (editForm.sender_phone && !isValidNigerianPhone(editForm.sender_phone)) {
      pErrors.sender = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    if (editForm.recipient_phone && !isValidNigerianPhone(editForm.recipient_phone)) {
      pErrors.recipient = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    setPhoneErrors(pErrors);
    if (pErrors.sender || pErrors.recipient) return;

    setEditLoading(true);
    setEditError('');
    try {
      const body = {
        ...editForm,
        sender_email: editForm.sender_email || null,
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
    w-full bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg
    px-3 py-2.5 text-[#f0f0f0] text-sm placeholder:text-[#a1a4a5]
    focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[rgba(33,38,41,0.4)]
    transition-colors
  `;
  const labelCls = 'text-[#a1a4a5] text-xs font-medium uppercase tracking-wider mb-1';

  // Build price lookup from pricing data
  const priceMap: Record<string, number> = {};
  pricing.forEach((p) => { priceMap[p.location] = p.price; });

  function calcFee(pickup: string, dropoff: string, express: boolean): number | null {
    if (!pickup || !dropoff) return null;
    const pickupPrice = priceMap[pickup];
    const dropoffPrice = priceMap[dropoff];
    if (pickupPrice === undefined && dropoffPrice === undefined) return null;
    const baseFee = Math.max(pickupPrice ?? 0, dropoffPrice ?? 0);
    return express ? Math.round(baseFee * 1.5) : baseFee;
  }

  function ZoneSelectAdmin({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
    return (
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">Select area</option>
        {(Object.entries(LAGOS_ZONES) as [string, readonly string[]][]).map(([category, zones]) => (
          <optgroup key={category} label={category}>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </optgroup>
        ))}
      </select>
    );
  }

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
    const update = (k: keyof typeof EMPTY_FORM, v: string | boolean) => {
      const next = { ...form, [k]: v };
      // Auto-calculate fee when pickup/dropoff/express changes
      if (k === 'pickup_area' || k === 'dropoff_area' || k === 'is_express') {
        const autoFee = calcFee(
          k === 'pickup_area' ? (v as string) : next.pickup_area,
          k === 'dropoff_area' ? (v as string) : next.dropoff_area,
          k === 'is_express' ? (v as boolean) : next.is_express,
        );
        if (autoFee !== null) next.fee = autoFee.toString();
      }
      // Clear phone errors on change
      if (k === 'sender_phone' || k === 'recipient_phone') {
        setPhoneErrors((p) => ({ ...p, [k === 'sender_phone' ? 'sender' : 'recipient']: undefined }));
      }
      setForm(next);
    };

    const calculatedFee = calcFee(form.pickup_area, form.dropoff_area, form.is_express);

    return (
      <form onSubmit={onSubmit} className="space-y-3">
        {fError && (
          <div className="p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">{fError}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Sender Name</p>
            <input className={inputCls} value={form.sender_name} onChange={(e) => update('sender_name', e.target.value)} required placeholder="John Doe" />
          </div>
          <div>
            <p className={labelCls}>Sender Phone</p>
            <input className={inputCls} type="tel" value={form.sender_phone} onChange={(e) => update('sender_phone', e.target.value)} required placeholder="08012345678" />
            {phoneErrors.sender && <p className="text-[#a85858] text-xs mt-1">{phoneErrors.sender}</p>}
          </div>
        </div>
        <div>
          <p className={labelCls}>Sender Email <span className="text-[#555] normal-case">(optional)</span></p>
          <input className={inputCls} type="email" value={form.sender_email} onChange={(e) => update('sender_email', e.target.value)} placeholder="john@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Pickup Area</p>
            <ZoneSelectAdmin value={form.pickup_area} onChange={(v) => update('pickup_area', v)} required />
          </div>
          <div>
            <p className={labelCls}>Pickup Address</p>
            <AddressInput className={inputCls} value={form.pickup_address} onChange={(val) => update('pickup_address', val)} required placeholder="12 Main St" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Recipient Name</p>
            <input className={inputCls} value={form.recipient_name} onChange={(e) => update('recipient_name', e.target.value)} required placeholder="Jane Doe" />
          </div>
          <div>
            <p className={labelCls}>Recipient Phone</p>
            <input className={inputCls} type="tel" value={form.recipient_phone} onChange={(e) => update('recipient_phone', e.target.value)} required placeholder="08098765432" />
            {phoneErrors.recipient && <p className="text-[#a85858] text-xs mt-1">{phoneErrors.recipient}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Dropoff Area</p>
            <ZoneSelectAdmin value={form.dropoff_area} onChange={(v) => update('dropoff_area', v)} required />
          </div>
          <div>
            <p className={labelCls}>Dropoff Address</p>
            <AddressInput className={inputCls} value={form.dropoff_address} onChange={(val) => update('dropoff_address', val)} required placeholder="45 Ocean Dr" />
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
            <input className={inputCls} type="number" value={form.fee} onChange={(e) => update('fee', e.target.value)} placeholder="Auto-calculated" min="0" />
          </div>
        </div>

        {/* Delivery Cost Display */}
        {calculatedFee !== null && (
          <div className="p-3 bg-[#000000] border border-[#F2FF66]/30 rounded-lg flex items-center justify-between">
            <span className="text-[#a1a4a5] text-sm">Estimated Fee</span>
            <span className="text-[#F2FF66] text-lg font-bold">₦{calculatedFee.toLocaleString('en-NG')}</span>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_express}
            onChange={(e) => update('is_express', e.target.checked)}
            className="w-4 h-4 accent-[#F2FF66]"
          />
          <span className="text-[#a1a4a5] text-sm">Express delivery (+50%)</span>
        </label>
        <button
          type="submit"
          disabled={fLoading}
          className="w-full bg-[#F2FF66] text-[#000000] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <h1 className="text-xl font-bold text-[#f0f0f0]">Orders</h1>
        <button
          onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateForm(EMPTY_FORM); }}
          className="bg-[#F2FF66] text-[#000000] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e8f55c] active:scale-95 transition-all"
        >
          + Create Order
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a4a5] text-sm">🔍</span>
        <input
          className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg pl-9 pr-4 py-2.5 text-[#f0f0f0] text-sm placeholder:text-[#a1a4a5] focus:outline-none focus:border-[#212629] transition-colors"
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
                ? 'bg-[#18191ce0] text-[#f0f0f0] border border-[rgba(255,255,255,0.12)]'
                : 'bg-[#070707] border border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0]'
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
      <p className="text-[#a1a4a5] text-xs">
        Showing {paginated.length} of {filtered.length} orders
      </p>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-2 animate-pulse">
              <div className="w-40 h-4 bg-[rgba(255,255,255,0.08)] rounded" />
              <div className="w-64 h-3 bg-[rgba(255,255,255,0.08)] rounded" />
              <div className="w-32 h-3 bg-[rgba(255,255,255,0.08)] rounded" />
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-16 text-center text-[#a1a4a5] text-sm">
          No orders found
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                {/* Card Header */}
                <button
                  className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[#f0f0f0] text-sm font-semibold">{order.id}</span>
                      {order.is_express && (
                        <span className="text-[10px] bg-[rgba(150,105,35,0.18)] text-[#aa8040] border border-[rgba(150,105,35,0.25)] px-1.5 py-0.5 rounded-full font-medium">EXPRESS</span>
                      )}
                    </div>
                    <p className="text-[#f0f0f0] text-sm mt-0.5">
                      {order.sender_name} → {order.recipient_name}
                    </p>
                    <p className="text-[#a1a4a5] text-xs mt-0.5">
                      {order.pickup_area} → {order.dropoff_area}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={order.status} />
                    <span className="text-[#a1a4a5] text-xs">{formatNaira(order.fee)}</span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[rgba(255,255,255,0.08)] space-y-3">
                    <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Sender</p>
                        <p className="text-[#f0f0f0]">{order.sender_name}</p>
                        <p className="text-[#a1a4a5]">{order.sender_phone}</p>
                        {order.sender_email && <p className="text-[#a1a4a5]">{order.sender_email}</p>}
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Recipient</p>
                        <p className="text-[#f0f0f0]">{order.recipient_name}</p>
                        <p className="text-[#a1a4a5]">{order.recipient_phone}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Pickup</p>
                        <p className="text-[#f0f0f0]">{order.pickup_address}</p>
                        <p className="text-[#a1a4a5]">{order.pickup_area}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Dropoff</p>
                        <p className="text-[#f0f0f0]">{order.dropoff_address}</p>
                        <p className="text-[#a1a4a5]">{order.dropoff_area}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Payment</p>
                        <p className="text-[#f0f0f0]">{PAYMENT_LABELS[order.payment_method]}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Rider</p>
                        <p className="text-[#f0f0f0]">{order.rider?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Created</p>
                        <p className="text-[#f0f0f0]">{formatDate(order.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-[#a1a4a5] mb-0.5">Source</p>
                        <p className="text-[#f0f0f0] capitalize">{order.created_by}</p>
                      </div>
                    </div>

                    {order.package_description && (
                      <div className="text-xs">
                        <p className="text-[#a1a4a5] mb-0.5">Package</p>
                        <p className="text-[#f0f0f0]">{order.package_description}</p>
                      </div>
                    )}

                    {/* Change Status */}
                    <div className="pt-1">
                      <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wider mb-1.5 font-medium">Change Status</p>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#212629]"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusChange(order.id, e.target.value as DeliveryStatus);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Change status to…</option>
                          {(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed', 'delivery_failed', 'returning', 'returned', 'cancelled'] as DeliveryStatus[])
                            .filter((s) => s !== order.status)
                            .map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                        {actionLoading === `status-${order.id}` && (
                          <span className="text-[#a1a4a5] text-sm self-center px-2">…</span>
                        )}
                      </div>
                    </div>

                    {/* Assign for Return — shown on delivery_failed orders */}
                    {order.status === 'delivery_failed' && (
                      <div className="p-3 bg-[rgba(180,60,40,0.08)] border border-[rgba(180,60,40,0.25)] rounded-xl flex flex-col gap-2">
                        <p className="text-[#c05040] text-xs font-semibold">Delivery Failed</p>
                        <p className="text-[#a1a4a5] text-xs leading-snug">
                          Assign a rider to return this package to the sender, then change status to <strong className="text-[#6080c0]">Returning</strong>.
                        </p>
                        <button
                          onClick={() => handleStatusChange(order.id, 'returning')}
                          className="w-full py-2 rounded-lg text-xs font-semibold bg-[#2a3560] text-[#6080c0] border border-[#6080c0]/30 hover:bg-[#354080] transition-colors"
                        >
                          Mark as Returning (Assign Rider for Return)
                        </button>
                      </div>
                    )}

                    {/* Assign / Reassign Rider — hidden for delivered/confirmed/returned */}
                    {!['delivered', 'confirmed', 'returned'].includes(order.status) && (
                      <div className="pt-1">
                        <p className="text-[#a1a4a5] text-[10px] uppercase tracking-wider mb-1.5 font-medium">
                          {order.rider_id ? 'Reassign Rider' : 'Assign Rider'}
                        </p>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#212629]"
                            value={assignMap[order.id] ?? ''}
                            onChange={(e) => setAssignMap((m) => ({ ...m, [order.id]: e.target.value }))}
                          >
                            <option value="">{order.rider_id ? 'Change rider...' : 'Assign rider...'}</option>
                            {riders.filter((r) => r.id !== order.rider_id).map((r) => (
                              <option key={r.id} value={r.id}>{r.name} — {r.phone}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(order.id)}
                            disabled={!assignMap[order.id] || actionLoading === `assign-${order.id}`}
                            className="bg-[#2d5a8a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `assign-${order.id}` ? '...' : order.rider_id ? 'Reassign' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Set Fee */}
                    {order.fee == null && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Set fee (₦)"
                          className="flex-1 bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder:text-[#a1a4a5] focus:outline-none focus:border-[#212629]"
                          value={feeMap[order.id] ?? ''}
                          onChange={(e) => setFeeMap((m) => ({ ...m, [order.id]: e.target.value }))}
                          min="0"
                        />
                        <button
                          onClick={() => handleSetFee(order.id)}
                          disabled={!feeMap[order.id] || actionLoading === `fee-${order.id}`}
                          className="bg-[#F2FF66] text-[#000000] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `fee-${order.id}` ? '...' : 'Set'}
                        </button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEdit(order)}
                        className="flex-1 border border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0] hover:border-[#212629] text-sm py-2 rounded-lg transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={actionLoading === `cancel-${order.id}`}
                        className="flex-1 border border-red-500/30 text-[#a85858] hover:bg-[rgba(135,55,55,0.12)] text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between sticky top-0 bg-[#070707] z-10">
              <h2 className="text-[#f0f0f0] font-bold">Create New Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#a1a4a5] hover:text-[#f0f0f0] text-xl leading-none">&times;</button>
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
          <div className="w-full max-w-lg bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between sticky top-0 bg-[#070707] z-10">
              <div>
                <h2 className="text-[#f0f0f0] font-bold">Edit Order</h2>
                <p className="text-[#a1a4a5] text-xs font-mono">{editTarget.id}</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditTarget(null); }} className="text-[#a1a4a5] hover:text-[#f0f0f0] text-xl leading-none">&times;</button>
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
