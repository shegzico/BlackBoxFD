'use client';

import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import AddressInput from '@/components/AddressInput';
import * as XLSX from 'xlsx';
import { Delivery, DeliveryStatus, STATUS_LABELS } from '@/lib/types';
import {
  CloseCircle, Eye, Edit2, Trash, Danger, SearchNormal1,
  ArrowRight2, ArrowDown2, DocumentDownload, CloseSquare,
} from 'iconsax-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Order {
  id: number;
  order_number: string;
  status: string;
  is_draft: boolean;
  pickup_area: string;
  pickup_address: string | null;
  pickup_date: string | null;
  total_fee: number | null;
  delivery_count: number;
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_phone: string;
  deliveries: Delivery[];
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
  totalDeliveries: number;
  completed: number;
  delivered: number;
  canceled: number;
}

const STATUS_FILTERS: (DeliveryStatus | 'all')[] = [
  'all', 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed', 'cancelled',
  'delivery_failed', 'returning', 'returned',
];

const REATTEMPT_WINDOW_MS = 48 * 60 * 60 * 1000;

const STATUS_PRIORITY: DeliveryStatus[] = [
  'in_transit', 'returning', 'picked_up', 'assigned', 'delivery_failed',
  'pending', 'delivered', 'confirmed', 'returned', 'cancelled',
];

function getOrderDominantStatus(deliveries: Delivery[]): DeliveryStatus {
  if (!deliveries.length) return 'pending';
  for (const s of STATUS_PRIORITY) {
    if (deliveries.some((d) => d.status === s)) return s;
  }
  return deliveries[0].status;
}

function computeStats(orders: Order[]): OrderStats {
  const all = orders.filter((o) => !o.is_draft).flatMap((o) => o.deliveries);
  return {
    totalDeliveries: all.length,
    completed: all.filter((d) => d.status === 'confirmed').length,
    delivered: all.filter((d) => d.status === 'delivered' || d.status === 'confirmed').length,
    canceled: all.filter((d) => d.status === 'cancelled').length,
  };
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
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)] sticky top-0 bg-[#070707] z-10">
          <div>
            <h2 className="text-[#f0f0f0] font-semibold text-base">Delivery Details</h2>
            <p className="font-mono text-xs text-[#a1a4a5] mt-0.5">{d.id}</p>
          </div>
          <button onClick={onClose} className="text-[#a1a4a5] hover:text-[#f0f0f0] p-1.5 rounded-lg transition-colors">
            <CloseCircle size={20} color="currentColor" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#1A1A1A] last:border-0">
              <span className="text-[#a1a4a5] text-xs flex-shrink-0 w-28">{label}</span>
              <span className="text-[#f0f0f0] text-xs text-right">{value}</span>
            </div>
          ))}
        </div>
        {d.history && d.history.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-[#a1a4a5] text-xs uppercase tracking-wider font-medium mb-3">Activity</p>
            <div className="space-y-2">
              {d.history.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.25)] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#f0f0f0]">{STATUS_LABELS[h.status] || h.status}</p>
                    {h.note && <p className="text-xs text-[#a1a4a5] mt-0.5">{h.note}</p>}
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

const inputCls = 'w-full bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#212629] transition-colors';

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

  const fields: { label: string; field: string; type?: string }[] = [
    { label: 'Recipient Name', field: 'recipient_name' },
    { label: 'Recipient Phone', field: 'recipient_phone', type: 'tel' },
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
        className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
          <div>
            <h2 className="text-[#f0f0f0] font-semibold text-base">Edit Delivery</h2>
            <p className="font-mono text-xs text-[#a1a4a5] mt-0.5">{order.id}</p>
          </div>
          <button onClick={onClose} className="text-[#a1a4a5] hover:text-[#f0f0f0] p-1.5 rounded-lg transition-colors">
            <CloseCircle size={20} color="currentColor" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-[rgba(135,55,55,0.12)] border border-red-500/20 rounded-lg text-[#a85858] text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(({ label, field, type = 'text' }) => (
              <div key={field} className={field === 'package_description' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] text-[#a1a4a5] uppercase tracking-wider font-medium mb-1.5">{label}</label>
                {field === 'package_description' ? (
                  <textarea
                    rows={2}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => set(field, e.target.value)}
                    className={inputCls + ' resize-none'}
                  />
                ) : field === 'dropoff_address' ? (
                  <AddressInput
                    value={form.dropoff_address}
                    onChange={(val) => set('dropoff_address', val)}
                    placeholder="Street address or landmark"
                    className={inputCls}
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
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#a1a4a5] hover:text-[#f0f0f0] border border-[rgba(255,255,255,0.08)] rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#F2FF66] text-[#000000] text-sm font-semibold rounded-lg hover:bg-[#e8f550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cancel Modal                                                        */
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
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-[rgba(135,55,55,0.12)] flex items-center justify-center mb-4">
          <Danger size={24} color="#a85858" />
        </div>
        <h3 className="text-[#f0f0f0] font-semibold text-base mb-1">Cancel Delivery?</h3>
        <p className="text-[#a1a4a5] text-sm mb-1">
          Tracking ID <span className="font-mono text-[#f0f0f0]">{order.id}</span> will be cancelled.
        </p>
        <p className="text-[#a1a4a5] text-xs mb-5">This action cannot be undone.</p>
        {error && <p className="text-[#a85858] text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">
            Keep
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#6a2828] hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Canceling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reattempt Modal                                                     */
/* ------------------------------------------------------------------ */

function ReattemptModal({
  order,
  onClose,
  onDone,
}: {
  order: Delivery;
  onClose: () => void;
  onDone: (updated: Delivery) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initiatedBy, setInitiatedBy] = useState<'sender' | 'recipient'>('sender');

  const failedAt = new Date(order.updated_at).getTime();
  const hoursLeft = Math.max(0, Math.ceil((REATTEMPT_WINDOW_MS - (Date.now() - failedAt)) / 3600000));

  async function handleReattempt() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('customer_token');
    try {
      const res = await fetch(`/api/customer/deliveries/${order.id}/reattempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ initiated_by: initiatedBy }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to request reattempt'); return; }
      onDone({ ...order, status: 'pending' });
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-[rgba(180,60,40,0.12)] flex items-center justify-center mb-4">
          <Danger size={24} color="#c05040" />
        </div>
        <h3 className="text-[#f0f0f0] font-semibold text-base mb-1">Request Reattempt</h3>
        <p className="text-[#a1a4a5] text-sm mb-1">
          <span className="font-mono text-[#f0f0f0]">{order.id}</span> will be reset to pending for a new delivery attempt.
        </p>
        <p className="text-[#c05040] text-xs mb-4">A reattempt fee will be charged. Window closes in ~{hoursLeft}h.</p>
        <div className="mb-4">
          <p className="text-[#a1a4a5] text-xs uppercase tracking-wider mb-2">Who is initiating?</p>
          <div className="flex gap-2">
            {(['sender', 'recipient'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setInitiatedBy(role)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  initiatedBy === role
                    ? 'bg-[#F2FF66] text-[#000000] border-[#F2FF66]'
                    : 'bg-[#000000] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
                }`}
              >
                {role === 'sender' ? 'Me (Sender)' : 'Recipient'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-[#a85858] text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleReattempt}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#F2FF66] text-[#000000] text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors hover:bg-[#e8f55c]"
          >
            {loading ? 'Requesting…' : 'Request Reattempt'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Button                                                       */
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
          ? 'text-red-500/60 hover:text-[#a85858] hover:bg-[rgba(135,55,55,0.12)]'
          : 'text-[#a1a4a5] hover:text-[#f0f0f0] hover:bg-[rgba(255,255,255,0.08)]'
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkbox                                                            */
/* ------------------------------------------------------------------ */

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange || (() => {})}
      onClick={onClick}
      className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] bg-transparent accent-[#F2FF66] cursor-pointer flex-shrink-0"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Excel Export                                                        */
/* ------------------------------------------------------------------ */

function exportDeliveriesToExcel(deliveries: Delivery[], orderMap: Map<string, string>) {
  const rows = deliveries.map((d) => ({
    'Order #': orderMap.get(d.id) || '—',
    'Tracking ID': d.id,
    'Recipient Name': d.recipient_name,
    'Recipient Phone': d.recipient_phone,
    'Recipient Email': d.recipient_email || '',
    'Pickup Area': d.pickup_area,
    'Pickup Address': d.pickup_address || '',
    'Drop-off Area': d.dropoff_area,
    'Drop-off Address': d.dropoff_address || '',
    'Status': d.status,
    'Fee (₦)': d.fee ?? '',
    'Pickup Date': d.pickup_date ? fmtDate(d.pickup_date) : '',
    'Created': fmtDate(d.created_at),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Deliveries');
  XLSX.writeFile(wb, `blackbox-orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function CustomerOrders() {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expand/collapse state (set of order_numbers currently expanded; default = all)
  const [expandedOrderNums, setExpandedOrderNums] = useState<Set<string>>(new Set());
  // Selection state (set of delivery IDs selected)
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());

  // Modal state
  const [viewOrder, setViewOrder] = useState<DeliveryWithHistory | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editOrder, setEditOrder] = useState<Delivery | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Delivery | null>(null);
  const [reattemptOrder, setReattemptOrder] = useState<Delivery | null>(null);
  const [bulkCanceling, setBulkCanceling] = useState(false);

  /* -- fetch -- */
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    try {
      const [deliveriesRes, ordersRes] = await Promise.all([
        fetch('/api/customer/deliveries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const rawDeliveries: Delivery[] = deliveriesRes.ok
        ? await deliveriesRes.json().then((d) => (Array.isArray(d) ? d : d.deliveries || []))
        : [];

      const rawOrders: Order[] = ordersRes.ok
        ? await ordersRes.json().then((d) => (Array.isArray(d) ? d : d.orders || []))
        : [];

      // Build a set of delivery IDs already covered by the orders API (nested deliveries).
      // This is more reliable than matching order_id because it avoids any type mismatch.
      const deliveryIdsInOrders = new Set<string>();
      for (const order of rawOrders) {
        for (const d of order.deliveries || []) {
          deliveryIdsInOrders.add(d.id);
        }
      }

      // Start with all proper orders (non-draft), using their nested deliveries from the API
      const finalOrders: Order[] = rawOrders
        .filter((o) => !o.is_draft && (o.deliveries?.length ?? 0) > 0)
        .map((o) => ({ ...o, deliveries: o.deliveries || [] }));

      // Drafts kept separately (handled by draftOrders derived state below)
      const draftOrdersList: Order[] = rawOrders
        .filter((o) => o.is_draft)
        .map((o) => ({ ...o, deliveries: o.deliveries || [] }));

      // Any delivery from the flat list not covered by an order → standalone row
      for (const delivery of rawDeliveries) {
        if (!deliveryIdsInOrders.has(delivery.id)) {
          finalOrders.push({
            id: 0,
            order_number: '',
            status: delivery.status,
            is_draft: false,
            pickup_area: delivery.pickup_area,
            pickup_address: delivery.pickup_address,
            pickup_date: delivery.pickup_date,
            total_fee: delivery.fee,
            delivery_count: 1,
            created_at: delivery.created_at,
            updated_at: delivery.updated_at,
            sender_name: delivery.sender_name,
            sender_phone: delivery.sender_phone,
            deliveries: [delivery],
          });
        }
      }

      finalOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const allToShow = [...draftOrdersList, ...finalOrders];
      setAllOrders(allToShow);
      setExpandedOrderNums(new Set(allToShow.map((o) => o.order_number || `d-${o.deliveries[0]?.id}`)));
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

  // Pre-fill search from URL param (e.g. ?search=ORD-XXXXXX from confirmation page)
  useEffect(() => {
    const q = searchParamsHook?.get('search');
    if (q) setSearch(q);
  }, [searchParamsHook]);

  /* -- derived data -- */
  const nonDraftOrders = allOrders.filter((o) => !o.is_draft);
  const draftOrders = allOrders.filter((o) => o.is_draft);

  // All deliveries flat (for stats and filter counts)
  const allDeliveries = nonDraftOrders.flatMap((o) => o.deliveries);

  // Build order_number lookup for each delivery (deliveryId → order_number)
  const deliveryOrderMap = new Map<string, string>();
  for (const order of nonDraftOrders) {
    for (const d of order.deliveries) {
      deliveryOrderMap.set(d.id, order.order_number);
    }
  }

  // Filtered orders + their filtered deliveries
  const filteredOrders = nonDraftOrders
    .map((order) => {
      let deliveries = order.deliveries;

      // Status filter
      if (statusFilter !== 'all') {
        deliveries = deliveries.filter((d) => d.status === statusFilter);
      }

      // Search filter
      const q = search.toLowerCase().trim();
      if (q) {
        const orderMatches = order.order_number.toLowerCase().includes(q);
        if (orderMatches) {
          // show all deliveries if the order number itself matches
          deliveries = order.deliveries.filter((d) => {
            if (statusFilter !== 'all' && d.status !== statusFilter) return false;
            return true;
          });
        } else {
          deliveries = deliveries.filter(
            (d) =>
              d.id.toLowerCase().includes(q) ||
              d.recipient_name.toLowerCase().includes(q) ||
              d.recipient_phone.includes(q)
          );
        }
      }

      // Date filter (by delivery created_at)
      if (dateFrom || dateTo) {
        deliveries = deliveries.filter((d) => {
          const date = new Date(d.created_at);
          if (dateFrom) { const f = new Date(dateFrom); f.setHours(0, 0, 0, 0); if (date < f) return false; }
          if (dateTo) { const t = new Date(dateTo); t.setHours(23, 59, 59, 999); if (date > t) return false; }
          return true;
        });
      }

      return { ...order, deliveries };
    })
    .filter((order) => order.deliveries.length > 0);

  // All visible delivery IDs (for select-all logic)
  const visibleDeliveryIds = filteredOrders.flatMap((o) => o.deliveries.map((d) => d.id));
  const allSelected = visibleDeliveryIds.length > 0 && visibleDeliveryIds.every((id) => selectedDeliveryIds.has(id));
  const someSelected = visibleDeliveryIds.some((id) => selectedDeliveryIds.has(id));

  /* -- selection handlers -- */
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedDeliveryIds(new Set());
    } else {
      setSelectedDeliveryIds(new Set(visibleDeliveryIds));
    }
  }

  function toggleSelectOrder(orderNum: string, deliveryIds: string[]) {
    const allIn = deliveryIds.every((id) => selectedDeliveryIds.has(id));
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (allIn) {
        deliveryIds.forEach((id) => next.delete(id));
      } else {
        deliveryIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectDelivery(id: string) {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* -- expand/collapse -- */
  function toggleExpand(orderNum: string) {
    setExpandedOrderNums((prev) => {
      const next = new Set(prev);
      if (next.has(orderNum)) next.delete(orderNum);
      else next.add(orderNum);
      return next;
    });
  }

  /* -- open view modal -- */
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

  /* -- bulk cancel -- */
  async function handleBulkCancel() {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    const selected = Array.from(selectedDeliveryIds);
    const cancelable = allDeliveries.filter((d) => selected.includes(d.id) && d.status === 'pending');
    if (!cancelable.length) return;
    if (!confirm(`Cancel ${cancelable.length} pending delivery(s)?`)) return;

    setBulkCanceling(true);
    for (const d of cancelable) {
      await fetch(`/api/deliveries/${d.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await fetchOrders();
    setSelectedDeliveryIds(new Set());
    setBulkCanceling(false);
  }

  /* -- export -- */
  function handleExport() {
    const selected = Array.from(selectedDeliveryIds);
    const toExport = allDeliveries.filter((d) => selected.includes(d.id));
    exportDeliveriesToExcel(toExport, deliveryOrderMap);
  }

  /* -- patch local state after edit/cancel -- */
  function applyDeliveryUpdate(updated: Delivery) {
    setAllOrders((prev) =>
      prev.map((order) => ({
        ...order,
        deliveries: order.deliveries.map((d) => (d.id === updated.id ? updated : d)),
      }))
    );
  }

  function applyDeliveryCancel(id: string) {
    setAllOrders((prev) =>
      prev.map((order) => ({
        ...order,
        deliveries: order.deliveries.map((d) =>
          d.id === id ? { ...d, status: 'cancelled' as DeliveryStatus } : d
        ),
      }))
    );
  }

  const stats = computeStats(allOrders);
  const statCards = [
    { label: 'Total Deliveries', value: stats.totalDeliveries },
    { label: 'Completed',        value: stats.completed },
    { label: 'Delivered',        value: stats.delivered },
    { label: 'Cancelled',        value: stats.canceled },
  ];

  const selectedCount = selectedDeliveryIds.size;
  const selectedDeliveries = allDeliveries.filter((d) => selectedDeliveryIds.has(d.id));
  const cancelableCount = selectedDeliveries.filter((d) => d.status === 'pending').length;

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#f0f0f0]">My Orders</h1>
        <Link
          href="/customer/orders/create"
          className="bg-[#F2FF66] text-[#000000] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 md:p-4">
            <p className="text-[#a1a4a5] text-[10px] md:text-xs font-medium uppercase tracking-wide">{card.label}</p>
            <p className="text-xl md:text-2xl font-bold mt-1 text-[#f0f0f0]">
              {loading ? <span className="inline-block w-8 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse align-middle" /> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a4a5]">
            <SearchNormal1 size={16} color="currentColor" />
          </div>
          <input
            type="text"
            placeholder="Search by order #, tracking ID or recipient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#212629]"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From" className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#212629] [color-scheme:dark]" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To" className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#212629] [color-scheme:dark]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] px-2 border border-[rgba(255,255,255,0.08)] rounded-lg transition-colors">Clear</button>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_FILTERS.map((s) => {
          const count = s === 'all' ? allDeliveries.length : allDeliveries.filter((d) => d.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-[#18191ce0] text-[#f0f0f0] border-[rgba(255,255,255,0.12)]'
                  : 'bg-[#070707] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl">
          <span className="text-xs text-[#f0f0f0] font-medium flex-1">
            {selectedCount} selected
          </span>
          {cancelableCount > 0 && (
            <button
              onClick={handleBulkCancel}
              disabled={bulkCanceling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#a85858] border border-[rgba(135,55,55,0.3)] rounded-lg hover:bg-[rgba(135,55,55,0.08)] transition-colors disabled:opacity-50"
            >
              <Danger size={13} color="currentColor" />
              {bulkCanceling ? 'Canceling…' : `Cancel (${cancelableCount})`}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <DocumentDownload size={13} color="currentColor" />
            Export Excel
          </button>
          <button
            onClick={() => setSelectedDeliveryIds(new Set())}
            className="text-[#555] hover:text-[#a1a4a5] transition-colors"
            title="Clear selection"
          >
            <CloseSquare size={18} color="currentColor" />
          </button>
        </div>
      )}

      {/* ---- Drafts ---- */}
      {draftOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xs font-semibold text-[#a1a4a5] uppercase tracking-wider">Drafts</h2>
            <span className="text-[10px] bg-[rgba(150,105,35,0.18)] text-[#aa8040] border border-[rgba(150,105,35,0.25)] px-2 py-0.5 rounded-full font-medium">{draftOrders.length}</span>
          </div>
          <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#111]">
                  {['Order #', 'Pickup area', 'Items', 'Date saved', 'Fee', ''].map((h) => (
                    <th key={h} className="text-left text-[#555] text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draftOrders.map((d) => (
                  <tr key={d.order_number} className="group border-b border-[#1A1A1A] last:border-0 hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#aa8040]">{d.order_number}</span>
                      <span className="ml-2 text-[9px] bg-[rgba(150,105,35,0.18)] text-[#aa8040] border border-[rgba(150,105,35,0.25)] px-1.5 py-0.5 rounded-full font-medium uppercase">Draft</span>
                    </td>
                    <td className="px-4 py-3 text-[#f0f0f0] text-xs">{d.pickup_area || '—'}</td>
                    <td className="px-4 py-3 text-[#a1a4a5] text-xs">{d.delivery_count}</td>
                    <td className="px-4 py-3 text-[#a1a4a5] text-xs">{fmtDate(d.updated_at || d.created_at)}</td>
                    <td className="px-4 py-3 text-[#a1a4a5] text-xs">{d.total_fee != null ? `₦${d.total_fee.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn title="Edit draft" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                          <Edit2 size={16} color="currentColor" />
                        </ActionBtn>
                        <ActionBtn title="Delete draft" variant="danger" onClick={() => {}}>
                          <Trash size={16} color="currentColor" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {draftOrders.map((d) => (
              <div key={d.order_number} className="bg-[#070707] border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-[#aa8040]">{d.order_number}</span>
                    <p className="text-sm text-[#f0f0f0] mt-1">{d.pickup_area} · {d.delivery_count} item{d.delivery_count !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-[#a1a4a5] mt-0.5">{fmtDate(d.updated_at || d.created_at)}{d.total_fee != null ? ` · ₦${d.total_fee.toLocaleString()}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ActionBtn title="Edit draft" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                      <Edit2 size={16} color="currentColor" />
                    </ActionBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[rgba(255,255,255,0.08)] mt-4" />
        </div>
      )}

      {/* ---- Count ---- */}
      <p className="text-[#555] text-xs">
        Showing {filteredOrders.reduce((sum, o) => sum + o.deliveries.length, 0)} of {allDeliveries.length} deliveries
      </p>

      {/* ---- Orders Table ---- */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-[#f0f0f0] font-medium">No orders found</p>
          <p className="text-[#a1a4a5] text-sm mt-1">
            {allDeliveries.length === 0 ? 'Your delivery history will appear here' : 'Try adjusting your filters'}
          </p>
          {allDeliveries.length === 0 && (
            <Link href="/customer/orders/create" className="inline-block mt-4 border border-[rgba(255,255,255,0.12)] text-[#f0f0f0] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              Create Your First Order
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#111]">
                  <th className="px-3 py-3 w-8">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && someSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="w-6" />
                  {['Order / Tracking ID', 'Route & Recipient', 'Status', 'Fee', 'Date', ''].map((h) => (
                    <th key={h} className="text-left text-[#555] text-xs font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const orderKey = order.order_number || `d-${order.deliveries[0]?.id}`;
                  const isMulti = order.deliveries.length > 1;
                  const isExpanded = expandedOrderNums.has(orderKey);
                  const orderDeliveryIds = order.deliveries.map((d) => d.id);
                  const allOrderSelected = orderDeliveryIds.every((id) => selectedDeliveryIds.has(id));
                  const someOrderSelected = orderDeliveryIds.some((id) => selectedDeliveryIds.has(id));

                  return (
                    <Fragment key={orderKey}>
                      {/* ---- Order Header Row ---- */}
                      <tr
                        key={orderKey}
                        className={`border-b border-[#1A1A1A] ${isMulti ? 'bg-[#0c0c0c] hover:bg-[#131313]' : 'hover:bg-[#1A1A1A]'} transition-colors ${!isMulti ? 'cursor-pointer' : ''}`}
                        onClick={!isMulti ? () => openView(order.deliveries[0].id) : undefined}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={allOrderSelected}
                            indeterminate={!allOrderSelected && someOrderSelected}
                            onChange={() => toggleSelectOrder(orderKey, orderDeliveryIds)}
                          />
                        </td>
                        {/* Expand toggle */}
                        <td className="py-3 pr-1">
                          {isMulti ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(orderKey); }}
                              className="text-[#555] hover:text-[#a1a4a5] transition-colors p-0.5"
                            >
                              {isExpanded
                                ? <ArrowDown2 size={14} color="currentColor" />
                                : <ArrowRight2 size={14} color="currentColor" />}
                            </button>
                          ) : (
                            <span className="w-5 inline-block" />
                          )}
                        </td>
                        {/* Order # / Tracking ID */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-0.5">
                            {order.order_number && (
                              <span className="font-mono text-[10px] text-[#F2FF66]/70">{order.order_number}</span>
                            )}
                            {!isMulti && (
                              <span className="font-mono text-xs text-[#a1a4a5]">{order.deliveries[0].id}</span>
                            )}
                            {isMulti && (
                              <span className="text-xs text-[#a1a4a5]">{order.deliveries.length} deliveries</span>
                            )}
                          </div>
                        </td>
                        {/* Route & Recipient */}
                        <td className="px-3 py-3 text-xs text-[#a1a4a5] max-w-[200px]">
                          {isMulti ? (
                            <span className="text-[#f0f0f0] truncate block">{order.pickup_area}</span>
                          ) : (
                            <>
                              <p className="text-[#f0f0f0] truncate">{order.deliveries[0].pickup_area} → {order.deliveries[0].dropoff_area}</p>
                              <p className="text-[#a1a4a5] truncate">{order.deliveries[0].recipient_name}</p>
                            </>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-3 py-3">
                          {isMulti ? (
                            <div className="flex flex-wrap gap-1">
                              {/* Show unique statuses */}
                              {Array.from(new Set(order.deliveries.map((d) => d.status))).map((s) => (
                                <StatusBadge key={s} status={s as DeliveryStatus} />
                              ))}
                            </div>
                          ) : (
                            <StatusBadge status={order.deliveries[0].status} />
                          )}
                        </td>
                        {/* Fee */}
                        <td className="px-3 py-3 text-xs text-[#a1a4a5] whitespace-nowrap">
                          {order.total_fee != null
                            ? `₦${order.total_fee.toLocaleString()}`
                            : order.deliveries[0]?.fee != null
                            ? `₦${order.deliveries[0].fee.toLocaleString()}`
                            : '—'}
                        </td>
                        {/* Date */}
                        <td className="px-3 py-3 text-xs text-[#a1a4a5] whitespace-nowrap">
                          {fmtDate(order.created_at)}
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          {!isMulti && (() => {
                            const d = order.deliveries[0];
                            const canEdit = d.status === 'pending';
                            const canCancel = d.status === 'pending';
                            const isFailed = d.status === 'delivery_failed';
                            const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                            return (
                              <div className="flex items-center justify-end gap-1">
                                {withinWindow && (
                                  <button
                                    onClick={() => setReattemptOrder(d)}
                                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#F2FF66] text-[#000000] hover:bg-[#e8f55c] transition-colors whitespace-nowrap"
                                  >
                                    Reattempt
                                  </button>
                                )}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ActionBtn title="View details" onClick={() => openView(d.id)}>
                                    <Eye size={16} color="currentColor" />
                                  </ActionBtn>
                                  <ActionBtn title={canEdit ? 'Edit' : 'Cannot edit'} onClick={() => setEditOrder(d)} disabled={!canEdit}>
                                    <Edit2 size={16} color="currentColor" />
                                  </ActionBtn>
                                  <ActionBtn title={canCancel ? 'Cancel' : 'Cannot cancel'} variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}>
                                    <Trash size={16} color="currentColor" />
                                  </ActionBtn>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>

                      {/* ---- Delivery Sub-Rows (expanded multi-delivery) ---- */}
                      {isMulti && isExpanded && order.deliveries.map((d) => {
                        const canEdit = d.status === 'pending';
                        const canCancel = d.status === 'pending';
                        const isFailed = d.status === 'delivery_failed';
                        const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                        return (
                          <tr
                            key={d.id}
                            className={`group border-b border-[#111] last:border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer ${isFailed ? 'bg-[rgba(180,60,40,0.03)]' : ''}`}
                            onClick={() => openView(d.id)}
                          >
                            {/* Checkbox */}
                            <td className="pl-6 pr-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedDeliveryIds.has(d.id)}
                                onChange={() => toggleSelectDelivery(d.id)}
                              />
                            </td>
                            <td className="py-2.5 pr-1">
                              {/* indent marker */}
                              <div className="w-3 h-3 border-l border-b border-[rgba(255,255,255,0.1)] ml-1 rounded-bl" />
                            </td>
                            {/* Tracking ID */}
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-[#a1a4a5]">{d.id}</span>
                            </td>
                            {/* Recipient + drop-off */}
                            <td className="px-3 py-2.5 text-xs text-[#a1a4a5] max-w-[200px]">
                              <p className="text-[#f0f0f0] truncate">{d.recipient_name}</p>
                              <p className="text-[#555] truncate">→ {d.dropoff_area}</p>
                            </td>
                            {/* Status */}
                            <td className="px-3 py-2.5"><StatusBadge status={d.status} /></td>
                            {/* Fee */}
                            <td className="px-3 py-2.5 text-xs text-[#a1a4a5]">
                              {d.fee != null ? `₦${d.fee.toLocaleString()}` : '—'}
                            </td>
                            {/* Date (empty - inherited from order header) */}
                            <td />
                            {/* Actions */}
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {withinWindow && (
                                  <button
                                    onClick={() => setReattemptOrder(d)}
                                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#F2FF66] text-[#000000] hover:bg-[#e8f55c] transition-colors whitespace-nowrap"
                                  >
                                    Reattempt
                                  </button>
                                )}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ActionBtn title="View details" onClick={() => openView(d.id)}>
                                    <Eye size={16} color="currentColor" />
                                  </ActionBtn>
                                  <ActionBtn title={canEdit ? 'Edit' : 'Cannot edit'} onClick={() => setEditOrder(d)} disabled={!canEdit}>
                                    <Edit2 size={16} color="currentColor" />
                                  </ActionBtn>
                                  <ActionBtn title={canCancel ? 'Cancel' : 'Cannot cancel'} variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}>
                                    <Trash size={16} color="currentColor" />
                                  </ActionBtn>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => {
              const orderKey = order.order_number || `d-${order.deliveries[0]?.id}`;
              const isMulti = order.deliveries.length > 1;
              const isExpanded = expandedOrderNums.has(orderKey);
              const orderDeliveryIds = order.deliveries.map((d) => d.id);
              const allOrderSelected = orderDeliveryIds.every((id) => selectedDeliveryIds.has(id));
              const someOrderSelected = orderDeliveryIds.some((id) => selectedDeliveryIds.has(id));

              return (
                <div
                  key={orderKey}
                  className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden"
                >
                  {/* Order header */}
                  <div className={`px-4 py-3 flex items-start gap-3 ${isMulti ? 'bg-[#0d0d0d] border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
                    <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={allOrderSelected}
                        indeterminate={!allOrderSelected && someOrderSelected}
                        onChange={() => toggleSelectOrder(orderKey, orderDeliveryIds)}
                      />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={isMulti ? () => toggleExpand(orderKey) : () => openView(order.deliveries[0].id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {order.order_number && <span className="font-mono text-[10px] text-[#F2FF66]/70">{order.order_number}</span>}
                        <div className="flex items-center gap-2">
                          {isMulti ? (
                            <span className="text-[10px] text-[#a1a4a5]">{order.deliveries.length} deliveries</span>
                          ) : (
                            <StatusBadge status={order.deliveries[0].status} />
                          )}
                          {isMulti && (
                            <span className="text-[#555]">
                              {isExpanded ? <ArrowDown2 size={14} color="currentColor" /> : <ArrowRight2 size={14} color="currentColor" />}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isMulti ? (
                        <>
                          <p className="font-mono text-xs text-[#a1a4a5]">{order.deliveries[0].id}</p>
                          <p className="text-sm text-[#f0f0f0] mt-0.5 truncate">{order.deliveries[0].pickup_area} → {order.deliveries[0].dropoff_area}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-[#a1a4a5]">{order.deliveries[0].recipient_name}</span>
                            {order.deliveries[0].fee != null && <span className="text-xs text-[#a1a4a5]">₦{order.deliveries[0].fee.toLocaleString()}</span>}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-[#f0f0f0] truncate">{order.pickup_area}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(order.deliveries.map((d) => d.status))).map((s) => (
                              <StatusBadge key={s} status={s as DeliveryStatus} />
                            ))}
                          </div>
                        </>
                      )}
                      <p className="text-[10px] text-[#555] mt-1">{fmtDate(order.created_at)}{order.total_fee != null ? ` · ₦${order.total_fee.toLocaleString()}` : ''}</p>
                    </div>
                  </div>

                  {/* Single delivery quick actions */}
                  {!isMulti && (() => {
                    const d = order.deliveries[0];
                    const canEdit = d.status === 'pending';
                    const canCancel = d.status === 'pending';
                    const isFailed = d.status === 'delivery_failed';
                    const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                    return (
                      <div className="px-4 pb-3">
                        {withinWindow && (
                          <button
                            onClick={() => setReattemptOrder(d)}
                            className="w-full mb-2 py-2 rounded-lg text-xs font-semibold bg-[#F2FF66] text-[#000000] hover:bg-[#e8f55c] transition-colors"
                          >
                            Request Reattempt (fee applies)
                          </button>
                        )}
                        <div className="flex items-center gap-1 border-t border-[rgba(255,255,255,0.06)] pt-2">
                          <ActionBtn title="View" onClick={() => openView(d.id)}>
                            <Eye size={16} color="currentColor" />
                          </ActionBtn>
                          <ActionBtn title="Edit" onClick={() => setEditOrder(d)} disabled={!canEdit}>
                            <Edit2 size={16} color="currentColor" />
                          </ActionBtn>
                          <ActionBtn title="Cancel" variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}>
                            <Trash size={16} color="currentColor" />
                          </ActionBtn>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Multi-delivery expanded sub-cards */}
                  {isMulti && isExpanded && (
                    <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {order.deliveries.map((d) => {
                        const canEdit = d.status === 'pending';
                        const canCancel = d.status === 'pending';
                        const isFailed = d.status === 'delivery_failed';
                        const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                        return (
                          <div key={d.id} className={`px-4 py-3 ${isFailed ? 'bg-[rgba(180,60,40,0.04)]' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedDeliveryIds.has(d.id)}
                                  onChange={() => toggleSelectDelivery(d.id)}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-mono text-xs text-[#a1a4a5]">{d.id}</span>
                                  <StatusBadge status={d.status} />
                                </div>
                                <p className="text-xs text-[#f0f0f0] truncate">{d.recipient_name}</p>
                                <p className="text-xs text-[#555] truncate">→ {d.dropoff_area}</p>
                                {d.fee != null && <p className="text-xs text-[#a1a4a5] mt-0.5">₦{d.fee.toLocaleString()}</p>}
                              </div>
                            </div>
                            {withinWindow && (
                              <button
                                onClick={() => setReattemptOrder(d)}
                                className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-[#F2FF66] text-[#000000] hover:bg-[#e8f55c] transition-colors"
                              >
                                Request Reattempt (fee applies)
                              </button>
                            )}
                            <div className="flex items-center gap-1 mt-2 border-t border-[rgba(255,255,255,0.05)] pt-2">
                              <ActionBtn title="View" onClick={() => openView(d.id)}>
                                <Eye size={14} color="currentColor" />
                              </ActionBtn>
                              <ActionBtn title="Edit" onClick={() => setEditOrder(d)} disabled={!canEdit}>
                                <Edit2 size={14} color="currentColor" />
                              </ActionBtn>
                              <ActionBtn title="Cancel" variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}>
                                <Trash size={14} color="currentColor" />
                              </ActionBtn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FAB (mobile) */}
      <Link
        href="/customer/orders/create"
        className="md:hidden fixed right-4 bottom-20 z-40 bg-[#F2FF66] text-[#000000] w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-[#E5F25E] active:scale-95 transition-all"
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
            applyDeliveryUpdate(updated);
            setEditOrder(null);
          }}
        />
      )}
      {cancelOrder && (
        <CancelModal
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onCanceled={(id) => {
            applyDeliveryCancel(id);
            setCancelOrder(null);
          }}
        />
      )}
      {reattemptOrder && (
        <ReattemptModal
          order={reattemptOrder}
          onClose={() => setReattemptOrder(null)}
          onDone={(updated) => {
            applyDeliveryUpdate(updated);
            setReattemptOrder(null);
          }}
        />
      )}
    </div>
  );
}
