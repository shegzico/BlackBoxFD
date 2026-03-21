'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryStatus, STATUS_LABELS, PAYMENT_LABELS, PaymentMethod } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

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
  is_draft: boolean;
}

interface DeliveryHistory {
  id: string;
  status: DeliveryStatus;
  note: string | null;
  created_at: string;
}

interface DeliveryWithHistory extends Delivery {
  history?: DeliveryHistory[];
}

interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  completedDeliveries: number;
  canceled: number;
}

const STATUS_FILTERS: (DeliveryStatus | 'all')[] = [
  'all', 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed', 'cancelled',
];

function computeStats(orders: Delivery[]): OrderStats {
  return {
    totalOrders: orders.length,
    completedOrders: orders.filter((o) => o.status === 'confirmed').length,
    completedDeliveries: orders.filter((o) => o.status === 'delivered' || o.status === 'confirmed').length,
    canceled: orders.filter((o) => o.status === 'cancelled').length,
  };
}

function sortOrders(orders: Delivery[]): Delivery[] {
  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'confirmed' && o.status !== 'cancelled');
  const done = orders.filter((o) => o.status === 'delivered' || o.status === 'confirmed' || o.status === 'cancelled');
  active.sort((a, b) => {
    if (a.pickup_date && b.pickup_date) return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
    if (a.pickup_date) return -1;
    if (b.pickup_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  done.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return [...active, ...done];
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  View Modal                                                          */
/* ------------------------------------------------------------------ */

function ViewModal({ delivery, onClose }: { delivery: DeliveryWithHistory; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const d = delivery;

  const rows = [
    { label: 'Tracking ID', value: d.id },
    { label: 'Status', value: <StatusBadge status={d.status} /> },
    { label: 'Pickup', value: `${d.pickup_area}${d.pickup_address ? ` — ${d.pickup_address}` : ''}` },
    { label: 'Drop-off', value: `${d.dropoff_area}${d.dropoff_address ? ` — ${d.dropoff_address}` : ''}` },
    { label: 'Pickup date', value: d.pickup_date ? fmtDate(d.pickup_date) : '—' },
    { label: 'Recipient', value: d.recipient_name },
    { label: 'Phone', value: d.recipient_phone },
    ...(d.recipient_email ? [{ label: 'Email', value: d.recipient_email }] : []),
    { label: 'Package', value: d.package_description || '—' },
    ...(d.package_weight ? [{ label: 'Weight', value: `${d.package_weight} kg` }] : []),
    ...(d.fee != null ? [{ label: 'Fee', value: `₦${d.fee.toLocaleString()}` }] : []),
    { label: 'Payment', value: PAYMENT_LABELS[d.payment_method as PaymentMethod] || d.payment_method },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#191314] border border-[#2A2A2A] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] sticky top-0 bg-[#191314] z-10">
          <div>
            <h2 className="text-[#FAFAFA] font-semibold text-base">Order Details</h2>
            <p className="font-mono text-xs text-[#F2FF66] mt-0.5">{d.id}</p>
          </div>
          <button onClick={onClose} className="text-[#888888] hover:text-[#FAFAFA] p-1.5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#1A1A1A] last:border-0">
              <span className="text-[#888888] text-xs flex-shrink-0 w-28">{label}</span>
              <span className="text-[#FAFAFA] text-xs text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* History */}
        {d.history && d.history.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-[#888888] text-xs uppercase tracking-wider font-medium mb-3">Activity</p>
            <div className="space-y-2">
              {d.history.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F2FF66] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#FAFAFA]">{STATUS_LABELS[h.status] || h.status}</p>
                    {h.note && <p className="text-xs text-[#888888] mt-0.5">{h.note}</p>}
                    <p className="text-[10px] text-[#555] mt-0.5">{fmtDate(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Modal                                                          */
/* ------------------------------------------------------------------ */

const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#555] focus:outline-none focus:border-[#F2FF66]/50 transition-colors';

function EditModal({
  order,
  onClose,
  onSaved,
}: {
  order: Delivery;
  onClose: () => void;
  onSaved: (updated: Delivery) => void;
}) {
  const [form, setForm] = useState({
    recipient_name: order.recipient_name || '',
    recipient_phone: order.recipient_phone || '',
    recipient_email: order.recipient_email || '',
    dropoff_address: order.dropoff_address || '',
    dropoff_area: order.dropoff_area || '',
    package_description: order.package_description || '',
    package_weight: order.package_weight?.toString() || '',
    pickup_date: order.pickup_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const token = localStorage.getItem('customer_token');
    try {
      const res = await fetch(`/api/customer/deliveries/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({
          ...form,
          package_weight: form.package_weight ? parseFloat(form.package_weight) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save changes');
        return;
      }
      onSaved({ ...order, ...form, package_weight: form.package_weight ? parseFloat(form.package_weight) : order.package_weight });
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const fields: { label: string; field: string; type?: string; required?: boolean }[] = [
    { label: 'Recipient Name', field: 'recipient_name', required: true },
    { label: 'Recipient Phone', field: 'recipient_phone', type: 'tel', required: true },
    { label: 'Recipient Email', field: 'recipient_email', type: 'email' },
    { label: 'Drop-off Address', field: 'dropoff_address' },
    { label: 'Drop-off Area', field: 'dropoff_area' },
    { label: 'Package Description', field: 'package_description' },
    { label: 'Weight (kg)', field: 'package_weight', type: 'number' },
    { label: 'Pickup Date', field: 'pickup_date', type: 'date' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#191314] border border-[#2A2A2A] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] flex-shrink-0">
          <div>
            <h2 className="text-[#FAFAFA] font-semibold text-base">Edit Order</h2>
            <p className="font-mono text-xs text-[#F2FF66] mt-0.5">{order.id}</p>
          </div>
          <button onClick={onClose} className="text-[#888888] hover:text-[#FAFAFA] p-1.5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(({ label, field, type = 'text' }) => (
              <div key={field} className={field === 'package_description' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] text-[#888888] uppercase tracking-wider font-medium mb-1.5">{label}</label>
                {field === 'package_description' ? (
                  <textarea
                    rows={2}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => set(field, e.target.value)}
                    className={inputCls + ' resize-none'}
                  />
                ) : (
                  <input
                    type={type}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => set(field, e.target.value)}
                    className={inputCls + (type === 'date' ? ' [color-scheme:dark]' : '')}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#888888] hover:text-[#FAFAFA] border border-[#2A2A2A] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#F2FF66] text-[#0A0A0A] text-sm font-semibold rounded-lg hover:bg-[#e8f550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cancel Confirm Modal                                                */
/* ------------------------------------------------------------------ */

function CancelModal({
  order,
  onClose,
  onCanceled,
}: {
  order: Delivery;
  onClose: () => void;
  onCanceled: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('customer_token');
    try {
      const res = await fetch(`/api/deliveries/${order.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to cancel');
        return;
      }
      onCanceled(order.id);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#191314] border border-[#2A2A2A] rounded-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-[#FAFAFA] font-semibold text-base mb-1">Cancel Order?</h3>
        <p className="text-[#888888] text-sm mb-1">
          Order <span className="font-mono text-[#F2FF66]">{order.id}</span> will be cancelled.
        </p>
        <p className="text-[#888888] text-xs mb-5">This action cannot be undone.</p>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-[#888888] border border-[#2A2A2A] rounded-lg hover:text-[#FAFAFA] transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Canceling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Draft Modal                                                  */
/* ------------------------------------------------------------------ */

function DeleteDraftModal({
  draft,
  onClose,
  onDeleted,
}: {
  draft: DraftOrder;
  onClose: () => void;
  onDeleted: (orderNumber: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const token = localStorage.getItem('customer_token');
    try {
      await fetch(`/api/orders/${draft.order_number}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      onDeleted(draft.order_number);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#191314] border border-[#2A2A2A] rounded-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-[#FAFAFA] font-semibold text-base mb-1">Delete Draft?</h3>
        <p className="text-[#888888] text-sm mb-5">
          Draft <span className="font-mono text-amber-400">{draft.order_number}</span> will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#888888] border border-[#2A2A2A] rounded-lg hover:text-[#FAFAFA] transition-colors">
            Keep
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row Action Buttons                                                  */
/* ------------------------------------------------------------------ */

function ActionBtn({
  title, onClick, disabled, variant = 'default', children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'text-red-500/60 hover:text-red-400 hover:bg-red-500/10'
          : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#2A2A2A]'
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

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

  // Modal state
  const [viewOrder, setViewOrder] = useState<DeliveryWithHistory | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editOrder, setEditOrder] = useState<Delivery | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Delivery | null>(null);
  const [deleteDraft, setDeleteDraft] = useState<DraftOrder | null>(null);

  /* -- fetch -- */
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    try {
      const [deliveriesRes, ordersRes] = await Promise.all([
        fetch('/api/customer/deliveries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        setAllOrders(Array.isArray(data) ? data : data.deliveries || []);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const all: DraftOrder[] = Array.isArray(data) ? data : data.orders || [];
        setDrafts(all.filter((o) => (o as unknown as { is_draft: boolean }).is_draft));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  /* -- filter + sort -- */
  useEffect(() => {
    let f = [...allOrders];
    if (statusFilter !== 'all') f = f.filter((o) => o.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) f = f.filter((o) => o.id.toLowerCase().includes(q) || o.recipient_name.toLowerCase().includes(q) || o.recipient_phone.includes(q));
    if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); f = f.filter((o) => new Date(o.created_at) >= d); }
    if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); f = f.filter((o) => new Date(o.created_at) <= d); }
    setOrders(sortOrders(f));
  }, [allOrders, statusFilter, search, dateFrom, dateTo]);

  /* -- open view modal (fetch full detail) -- */
  async function openView(id: string) {
    setViewLoading(true);
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(`/api/deliveries/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setViewOrder(data.delivery || data);
      }
    } finally {
      setViewLoading(false);
    }
  }

  const stats = computeStats(allOrders);
  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, color: 'text-[#F2FF66]' },
    { label: 'Completed', value: stats.completedOrders, color: 'text-green-400' },
    { label: 'Delivered', value: stats.completedDeliveries, color: 'text-emerald-400' },
    { label: 'Cancelled', value: stats.canceled, color: 'text-red-400' },
  ];

  /* ---- Icons ---- */
  const EyeIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  const PencilIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
    </svg>
  );
  const TrashIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
  const BanIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#FAFAFA]">My Orders</h1>
        <Link
          href="/customer/orders/create"
          className="bg-[#F2FF66] text-[#0A0A0A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-3 md:p-4">
            <p className="text-[#888888] text-[10px] md:text-xs font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-xl md:text-2xl font-bold mt-1 ${card.color}`}>
              {loading ? <span className="inline-block w-8 h-6 bg-[#2A2A2A] rounded animate-pulse align-middle" /> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by tracking ID or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#191314] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#555] focus:outline-none focus:border-[#F2FF66]/40"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From" className="bg-[#191314] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]/40 [color-scheme:dark]" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To" className="bg-[#191314] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]/40 [color-scheme:dark]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-[#888888] hover:text-[#FAFAFA] px-2 border border-[#2A2A2A] rounded-lg transition-colors">Clear</button>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_FILTERS.map((s) => {
          const count = s === 'all' ? allOrders.length : allOrders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-[#F2FF66]/10 text-[#F2FF66] border-[#F2FF66]/20'
                  : 'bg-[#191314] text-[#888888] border-[#2A2A2A] hover:text-[#FAFAFA]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ---- Drafts Table ---- */}
      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-wider">Drafts</h2>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">{drafts.length}</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-[#2A2A2A] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#111]">
                  {['Order #', 'Pickup area', 'Items', 'Date saved', 'Fee', ''].map((h) => (
                    <th key={h} className="text-left text-[#555] text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.order_number} className="group border-b border-[#1A1A1A] last:border-0 hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-amber-400">{d.order_number}</span>
                      <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-medium uppercase">Draft</span>
                    </td>
                    <td className="px-4 py-3 text-[#FAFAFA] text-xs">{d.pickup_area || '—'}</td>
                    <td className="px-4 py-3 text-[#888888] text-xs">{d.delivery_count}</td>
                    <td className="px-4 py-3 text-[#888888] text-xs">{fmtDate(d.updated_at || d.created_at)}</td>
                    <td className="px-4 py-3 text-[#888888] text-xs">{d.total_fee != null ? `₦${d.total_fee.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn title="Edit draft" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                          {PencilIcon}
                        </ActionBtn>
                        <ActionBtn title="Delete draft" variant="danger" onClick={() => setDeleteDraft(d)}>
                          {TrashIcon}
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {drafts.map((d) => (
              <div key={d.order_number} className="bg-[#191314] border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-amber-400">{d.order_number}</span>
                    <p className="text-sm text-[#FAFAFA] mt-1">{d.pickup_area} · {d.delivery_count} item{d.delivery_count !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-[#888888] mt-0.5">{fmtDate(d.updated_at || d.created_at)}{d.total_fee != null ? ` · ₦${d.total_fee.toLocaleString()}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ActionBtn title="Edit draft" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                      {PencilIcon}
                    </ActionBtn>
                    <ActionBtn title="Delete draft" variant="danger" onClick={() => setDeleteDraft(d)}>
                      {TrashIcon}
                    </ActionBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#2A2A2A] mt-4" />
        </div>
      )}

      {/* ---- Orders count ---- */}
      <p className="text-[#555] text-xs">Showing {orders.length} of {allOrders.length} orders</p>

      {/* ---- Orders Table ---- */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-[#FAFAFA] font-medium">No orders found</p>
          <p className="text-[#888888] text-sm mt-1">
            {allOrders.length === 0 ? 'Your delivery history will appear here' : 'Try adjusting your filters'}
          </p>
          {allOrders.length === 0 && (
            <Link href="/customer/orders/create" className="inline-block mt-4 bg-[#F2FF66] text-[#0A0A0A] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors">
              Create Your First Order
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-[#2A2A2A] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#111]">
                  {['Tracking ID', 'Route', 'Recipient', 'Pickup date', 'Fee', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-[#555] text-xs font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const canEdit = order.status === 'pending';
                  const canCancel = order.status === 'pending';
                  return (
                    <tr
                      key={order.id}
                      className="group border-b border-[#1A1A1A] last:border-0 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                      onClick={() => openView(order.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#F2FF66]">{order.id}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#FAFAFA] max-w-[180px]">
                        <p className="truncate">{order.pickup_area} → {order.dropoff_area}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#888888] whitespace-nowrap">{order.recipient_name}</td>
                      <td className="px-4 py-3 text-xs text-[#888888] whitespace-nowrap">
                        {order.pickup_date ? fmtDate(order.pickup_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#888888] whitespace-nowrap">
                        {order.fee != null ? `₦${order.fee.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn title="View details" onClick={() => openView(order.id)}>
                            {EyeIcon}
                          </ActionBtn>
                          <ActionBtn title={canEdit ? 'Edit order' : 'Cannot edit — order is in progress'} onClick={() => setEditOrder(order)} disabled={!canEdit}>
                            {PencilIcon}
                          </ActionBtn>
                          <ActionBtn title={canCancel ? 'Cancel order' : 'Cannot cancel — order is in progress'} variant="danger" onClick={() => setCancelOrder(order)} disabled={!canCancel}>
                            {BanIcon}
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {orders.map((order) => {
              const canEdit = order.status === 'pending';
              const canCancel = order.status === 'pending';
              return (
                <div key={order.id} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-[#F2FF66] truncate">{order.id}</p>
                      <p className="text-sm text-[#FAFAFA] mt-1 truncate">{order.pickup_area} → {order.dropoff_area}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-[#888888]">{order.recipient_name}</span>
                        {order.pickup_date && <span className="text-xs text-[#888888]">{fmtDate(order.pickup_date)}</span>}
                        {order.fee != null && <span className="text-xs text-[#888888]">₦{order.fee.toLocaleString()}</span>}
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  {/* Always-visible actions on mobile */}
                  <div className="flex items-center gap-1 border-t border-[#2A2A2A] pt-3">
                    <ActionBtn title="View details" onClick={() => openView(order.id)}>
                      {EyeIcon}
                    </ActionBtn>
                    <ActionBtn title="Edit order" onClick={() => setEditOrder(order)} disabled={!canEdit}>
                      {PencilIcon}
                    </ActionBtn>
                    <ActionBtn title="Cancel order" variant="danger" onClick={() => setCancelOrder(order)} disabled={!canCancel}>
                      {BanIcon}
                    </ActionBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FAB (mobile) */}
      <Link
        href="/customer/orders/create"
        className="md:hidden fixed right-4 bottom-20 z-40 bg-[#F2FF66] text-[#0A0A0A] w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-[#E5F25E] active:scale-95 transition-all"
        aria-label="Create Order"
      >+</Link>

      {/* Loading spinner for view */}
      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-[#F2FF66]/30 border-t-[#F2FF66] rounded-full animate-spin" />
        </div>
      )}

      {/* Modals */}
      {viewOrder && <ViewModal delivery={viewOrder} onClose={() => setViewOrder(null)} />}
      {editOrder && (
        <EditModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSaved={(updated) => {
            setAllOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
            setEditOrder(null);
          }}
        />
      )}
      {cancelOrder && (
        <CancelModal
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onCanceled={(id) => {
            setAllOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'cancelled' as DeliveryStatus } : o));
            setCancelOrder(null);
          }}
        />
      )}
      {deleteDraft && (
        <DeleteDraftModal
          draft={deleteDraft}
          onClose={() => setDeleteDraft(null)}
          onDeleted={(orderNumber) => {
            setDrafts((prev) => prev.filter((d) => d.order_number !== orderNumber));
            setDeleteDraft(null);
          }}
        />
      )}
    </div>
  );
}
