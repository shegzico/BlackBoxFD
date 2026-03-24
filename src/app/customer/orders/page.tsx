'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import AddressInput from '@/components/AddressInput';
import * as XLSX from 'xlsx';
import { Delivery, DeliveryStatus, STATUS_LABELS, PAYMENT_LABELS } from '@/lib/types';
import {
  CloseCircle, Eye, Edit2, Trash, Danger, SearchNormal1,
  ArrowDown2, ArrowUp2, DocumentDownload, CloseSquare, Setting4,
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

interface DeliveryRow extends Delivery {
  order_number: string;
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

/* ------------------------------------------------------------------ */
/*  Column Config                                                       */
/* ------------------------------------------------------------------ */

interface ColDef {
  key: string;
  label: string;
  always?: boolean;
}

const COLUMNS: ColDef[] = [
  { key: 'order_number', label: 'Order #' },
  { key: 'tracking_id', label: 'Tracking ID', always: true },
  { key: 'status', label: 'Status', always: true },
  { key: 'recipient', label: 'Recipient' },
  { key: 'route', label: 'Route' },
  { key: 'fee', label: 'Fee' },
  { key: 'date', label: 'Date' },
  { key: 'pickup_date', label: 'Pickup Date' },
  { key: 'package', label: 'Package' },
  { key: 'payment', label: 'Payment' },
];

const DEFAULT_VISIBLE_COLS = ['order_number', 'tracking_id', 'status', 'recipient', 'route', 'fee', 'date'];

/* ------------------------------------------------------------------ */
/*  Status Filter Config                                                */
/* ------------------------------------------------------------------ */

const PRIMARY_STATUS: (DeliveryStatus | 'all')[] = ['all', 'picked_up', 'in_transit'];
const MORE_STATUS: DeliveryStatus[] = [
  'pending', 'assigned', 'delivered', 'confirmed', 'cancelled',
  'delivery_failed', 'returning', 'returned',
];

/* ------------------------------------------------------------------ */
/*  Date Period Config                                                  */
/* ------------------------------------------------------------------ */

const DATE_PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'Custom', value: 'custom' },
] as const;
type DatePeriodValue = (typeof DATE_PERIODS)[number]['value'];

function getPeriodRange(period: DatePeriodValue): { from: Date; to: Date } | null {
  const now = new Date();
  if (period === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'week') {
    const day = now.getDay();
    const from = new Date(now); from.setDate(now.getDate() - day); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'last7') {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'last30') {
    const from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const REATTEMPT_WINDOW_MS = 48 * 60 * 60 * 1000;

function computeStats(orders: Order[]) {
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
    { label: 'Payment', value: PAYMENT_LABELS[d.payment_method] || d.payment_method },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

function EditModal({ order, onClose, onSaved }: { order: Delivery; onClose: () => void; onSaved: (updated: Delivery) => void }) {
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
      <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          {error && <div className="mb-4 px-3 py-2.5 bg-[rgba(135,55,55,0.12)] border border-red-500/20 rounded-lg text-[#a85858] text-xs">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(({ label, field, type = 'text' }) => (
              <div key={field} className={field === 'package_description' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] text-[#a1a4a5] uppercase tracking-wider font-medium mb-1.5">{label}</label>
                {field === 'package_description' ? (
                  <textarea rows={2} value={form[field as keyof typeof form]} onChange={(e) => set(field, e.target.value)} className={inputCls + ' resize-none'} />
                ) : field === 'dropoff_address' ? (
                  <AddressInput value={form.dropoff_address} onChange={(val) => set('dropoff_address', val)} placeholder="Street address or landmark" className={inputCls} />
                ) : (
                  <input type={type} value={form[field as keyof typeof form]} onChange={(e) => set(field, e.target.value)} className={inputCls + (type === 'date' ? ' [color-scheme:dark]' : '')} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#a1a4a5] hover:text-[#f0f0f0] border border-[rgba(255,255,255,0.08)] rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#F2FF66] text-[#000000] text-sm font-semibold rounded-lg hover:bg-[#e8f550] disabled:opacity-50 transition-colors">
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

function CancelModal({ order, onClose, onCanceled }: { order: Delivery; onClose: () => void; onCanceled: (id: string) => void }) {
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
          Tracking ID <span className="font-mono text-[#f0f0f0]">{order.id}</span> will be cancelled and a refund will be initiated if applicable.
        </p>
        <p className="text-[#a1a4a5] text-xs mb-5">The delivery record will remain in your orders history.</p>
        {error && <p className="text-[#a85858] text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">Keep</button>
          <button onClick={handleCancel} disabled={loading} className="flex-1 px-4 py-2.5 bg-[#6a2828] hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
            {loading ? 'Canceling…' : 'Cancel & Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Draft Modal                                                  */
/* ------------------------------------------------------------------ */

function DeleteDraftModal({ orderNumber, orderId, onClose, onDeleted }: { orderNumber: string; orderId: number; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('customer_token');
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete draft');
        return;
      }
      onDeleted();
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
          <Trash size={24} color="#a85858" />
        </div>
        <h3 className="text-[#f0f0f0] font-semibold text-base mb-1">Delete Draft?</h3>
        <p className="text-[#a1a4a5] text-sm mb-1">
          Draft <span className="font-mono text-[#f0f0f0]">{orderNumber}</span> and all its deliveries will be permanently deleted.
        </p>
        <p className="text-[#a1a4a5] text-xs mb-5">This removes the record completely — it cannot be undone.</p>
        {error && <p className="text-[#a85858] text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">Keep</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2.5 bg-[#6a2828] hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reattempt Modal                                                     */
/* ------------------------------------------------------------------ */

function ReattemptModal({ order, onClose, onDone }: { order: Delivery; onClose: () => void; onDone: (updated: Delivery) => void }) {
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
                  initiatedBy === role ? 'bg-[#F2FF66] text-[#000000] border-[#F2FF66]' : 'bg-[#000000] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
                }`}
              >
                {role === 'sender' ? 'Me (Sender)' : 'Recipient'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-[#a85858] text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">Cancel</button>
          <button onClick={handleReattempt} disabled={loading} className="flex-1 px-4 py-2.5 bg-[#F2FF66] text-[#000000] text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors hover:bg-[#e8f55c]">
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

function ActionBtn({ title, onClick, disabled, variant = 'default', children }: {
  title: string; onClick: () => void; disabled?: boolean; variant?: 'default' | 'danger'; children: React.ReactNode;
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

function Checkbox({ checked, indeterminate = false, onChange }: { checked: boolean; indeterminate?: boolean; onChange?: () => void }) {
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
      className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] bg-transparent accent-[#F2FF66] cursor-pointer flex-shrink-0"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Excel Export                                                        */
/* ------------------------------------------------------------------ */

function exportDeliveriesToExcel(deliveries: DeliveryRow[]) {
  const rows = deliveries.map((d) => ({
    'Order #': d.order_number || '—',
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

  const [activeTab, setActiveTab] = useState<'orders' | 'drafts'>('orders');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [showMoreStatus, setShowMoreStatus] = useState(false);
  const moreStatusRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [datePeriod, setDatePeriod] = useState<DatePeriodValue | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sort state
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLS));
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCanceling, setBulkCanceling] = useState(false);

  // Modals
  const [viewOrder, setViewOrder] = useState<DeliveryWithHistory | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editOrder, setEditOrder] = useState<Delivery | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Delivery | null>(null);
  const [reattemptOrder, setReattemptOrder] = useState<Delivery | null>(null);
  const [deleteDraft, setDeleteDraft] = useState<{ orderNumber: string; orderId: number } | null>(null);

  // Load saved column prefs
  useEffect(() => {
    const saved = localStorage.getItem('bbfd_order_cols');
    if (saved) {
      try { setVisibleCols(new Set(JSON.parse(saved))); } catch { /* ignore */ }
    }
  }, []);

  function toggleCol(key: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem('bbfd_order_cols', JSON.stringify(Array.from(next)));
      return next;
    });
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreStatusRef.current && !moreStatusRef.current.contains(e.target as Node)) setShowMoreStatus(false);
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

      // Group flat deliveries by order_id (string keys to avoid type mismatch)
      const deliveriesByOrderId = new Map<string, Delivery[]>();
      for (const delivery of rawDeliveries) {
        const orderId = (delivery as Delivery & { order_id?: number | string | null }).order_id;
        if (orderId != null) {
          const key = String(orderId);
          if (!deliveriesByOrderId.has(key)) deliveriesByOrderId.set(key, []);
          deliveriesByOrderId.get(key)!.push(delivery);
        }
      }

      const finalOrders: Order[] = rawOrders
        .filter((o) => !o.is_draft)
        .map((o) => ({ ...o, deliveries: deliveriesByOrderId.get(String(o.id)) || [] }))
        .filter((o) => o.deliveries.length > 0);

      const draftOrdersList: Order[] = rawOrders
        .filter((o) => o.is_draft)
        .map((o) => ({ ...o, deliveries: deliveriesByOrderId.get(String(o.id)) || [] }));

      const coveredIds = new Set<string>(finalOrders.flatMap((o) => o.deliveries.map((d) => d.id)));

      for (const delivery of rawDeliveries) {
        if (!coveredIds.has(delivery.id)) {
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
      setAllOrders([...draftOrdersList, ...finalOrders]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); fetchOrders(); }, [fetchOrders]);

  // Pre-fill search from URL
  useEffect(() => {
    const q = searchParamsHook?.get('search');
    if (q) setSearch(q);
    if (searchParamsHook?.get('saved') === 'draft') setActiveTab('drafts');
  }, [searchParamsHook]);

  /* -- derived -- */
  const nonDraftOrders = allOrders.filter((o) => !o.is_draft);
  const draftOrders = allOrders.filter((o) => o.is_draft);
  const allDeliveries: DeliveryRow[] = nonDraftOrders.flatMap((o) =>
    o.deliveries.map((d) => ({ ...d, order_number: o.order_number }))
  );

  /* -- filter + sort -- */
  function applyFilters(rows: DeliveryRow[]): DeliveryRow[] {
    let r = rows;
    if (statusFilter !== 'all') r = r.filter((d) => d.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) r = r.filter((d) =>
      d.id.toLowerCase().includes(q) ||
      d.order_number.toLowerCase().includes(q) ||
      d.recipient_name.toLowerCase().includes(q) ||
      d.recipient_phone.includes(q)
    );
    if (datePeriod && datePeriod !== 'custom') {
      const range = getPeriodRange(datePeriod as DatePeriodValue);
      if (range) r = r.filter((d) => { const dt = new Date(d.created_at); return dt >= range.from && dt <= range.to; });
    } else if (datePeriod === 'custom') {
      r = r.filter((d) => {
        const dt = new Date(d.created_at);
        if (dateFrom) { const f = new Date(dateFrom); f.setHours(0, 0, 0, 0); if (dt < f) return false; }
        if (dateTo) { const t = new Date(dateTo); t.setHours(23, 59, 59, 999); if (dt > t) return false; }
        return true;
      });
    }
    return r;
  }

  function applySort(rows: DeliveryRow[]): DeliveryRow[] {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'order_number') cmp = a.order_number.localeCompare(b.order_number);
      else if (sortField === 'tracking_id') cmp = a.id.localeCompare(b.id);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'recipient') cmp = a.recipient_name.localeCompare(b.recipient_name);
      else if (sortField === 'fee') cmp = (a.fee ?? 0) - (b.fee ?? 0);
      else if (sortField === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === 'pickup_date') cmp = (a.pickup_date ? new Date(a.pickup_date).getTime() : 0) - (b.pickup_date ? new Date(b.pickup_date).getTime() : 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const filteredDeliveries = applySort(applyFilters(allDeliveries));

  const visibleIds = filteredDeliveries.map((d) => d.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = visibleIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleIds));
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  async function openView(id: string) {
    setViewLoading(true);
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(`/api/deliveries/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) { const data = await res.json(); setViewOrder(data.delivery || data); }
    } finally { setViewLoading(false); }
  }

  async function handleBulkCancel() {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    const cancelable = allDeliveries.filter((d) => selectedIds.has(d.id) && d.status === 'pending');
    if (!cancelable.length) return;
    if (!confirm(`Cancel ${cancelable.length} pending delivery(s)?`)) return;
    setBulkCanceling(true);
    for (const d of cancelable) {
      await fetch(`/api/deliveries/${d.id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    await fetchOrders();
    setSelectedIds(new Set());
    setBulkCanceling(false);
  }

  function handleExport() {
    const toExport = allDeliveries.filter((d) => selectedIds.has(d.id));
    exportDeliveriesToExcel(toExport);
  }

  function applyDeliveryUpdate(updated: Delivery) {
    setAllOrders((prev) => prev.map((order) => ({ ...order, deliveries: order.deliveries.map((d) => d.id === updated.id ? updated : d) })));
  }
  function applyDeliveryCancel(id: string) {
    setAllOrders((prev) => prev.map((order) => ({ ...order, deliveries: order.deliveries.map((d) => d.id === id ? { ...d, status: 'cancelled' as DeliveryStatus } : d) })));
  }

  const stats = computeStats(allOrders);
  const selectedCount = selectedIds.size;
  const cancelableCount = allDeliveries.filter((d) => selectedIds.has(d.id) && d.status === 'pending').length;
  const moreStatusActive = MORE_STATUS.includes(statusFilter as DeliveryStatus);

  // Sort icon helper
  function SortIndicator({ field }: { field: string }) {
    if (field !== sortField) return <span className="inline ml-1 opacity-20 text-[10px]">↕</span>;
    return sortDir === 'asc'
      ? <ArrowUp2 size={11} color="currentColor" className="inline ml-1" />
      : <ArrowDown2 size={11} color="currentColor" className="inline ml-1" />;
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#f0f0f0]">My Orders</h1>
        <Link href="/customer/orders/create" className="bg-[#F2FF66] text-[#000000] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors">
          + New Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Deliveries', value: stats.totalDeliveries },
          { label: 'Completed', value: stats.completed },
          { label: 'Delivered', value: stats.delivered },
          { label: 'Cancelled', value: stats.canceled },
        ].map((card) => (
          <div key={card.label} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 md:p-4">
            <p className="text-[#a1a4a5] text-[10px] md:text-xs font-medium uppercase tracking-wide">{card.label}</p>
            <p className="text-xl md:text-2xl font-bold mt-1 text-[#f0f0f0]">
              {loading ? <span className="inline-block w-8 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse align-middle" /> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[rgba(255,255,255,0.08)]">
        {(['orders', 'drafts'] as const).map((tab) => {
          const count = tab === 'orders' ? allDeliveries.length : draftOrders.length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#F2FF66] text-[#F2FF66]'
                  : 'border-transparent text-[#a1a4a5] hover:text-[#f0f0f0]'
              }`}
            >
              {tab === 'orders' ? 'Orders' : 'Drafts'}
              <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ======= ORDERS TAB ======= */}
      {activeTab === 'orders' && (
        <>
          {/* Search + Column Picker */}
          <div className="flex gap-2">
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
            <div className="relative flex-shrink-0" ref={colPickerRef}>
              <button
                onClick={() => setShowColPicker((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm border transition-colors ${
                  showColPicker ? 'bg-[#111] border-[rgba(255,255,255,0.15)] text-[#f0f0f0]' : 'bg-[#070707] border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0]'
                }`}
                title="Customize columns"
              >
                <Setting4 size={16} color="currentColor" />
                <span className="hidden sm:inline text-xs">Columns</span>
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-xl min-w-[160px]">
                  <p className="text-[10px] text-[#555] uppercase tracking-wider font-medium mb-2">Visible Columns</p>
                  {COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        disabled={col.always}
                        onChange={() => !col.always && toggleCol(col.key)}
                        className="w-3.5 h-3.5 accent-[#F2FF66] cursor-pointer disabled:cursor-default"
                      />
                      <span className={`text-xs ${visibleCols.has(col.key) ? 'text-[#f0f0f0]' : 'text-[#555]'}`}>{col.label}</span>
                      {col.always && <span className="text-[9px] text-[#333] ml-auto">always</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Period Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-[#555] flex-shrink-0">Period:</span>
            {DATE_PERIODS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => {
                  setDatePeriod(datePeriod === value ? '' : value);
                  if (value !== 'custom') { setDateFrom(''); setDateTo(''); }
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  datePeriod === value
                    ? 'bg-[#18191ce0] text-[#f0f0f0] border-[rgba(255,255,255,0.12)]'
                    : 'bg-[#070707] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {datePeriod === 'custom' && (
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From" className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none [color-scheme:dark]" />
              <span className="text-[#555] text-xs">to</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To" className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none [color-scheme:dark]" />
            </div>
          )}

          {/* Status Filter */}
          <div className="flex gap-2 items-center overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            {PRIMARY_STATUS.map((s) => {
              const count = s === 'all' ? allDeliveries.length : allDeliveries.filter((d) => d.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s ? 'bg-[#18191ce0] text-[#f0f0f0] border-[rgba(255,255,255,0.12)]' : 'bg-[#070707] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
                  }`}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
            {/* More dropdown */}
            <div className="relative flex-shrink-0" ref={moreStatusRef}>
              <button
                onClick={() => setShowMoreStatus((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  moreStatusActive ? 'bg-[#18191ce0] text-[#f0f0f0] border-[rgba(255,255,255,0.12)]' : 'bg-[#070707] text-[#a1a4a5] border-[rgba(255,255,255,0.08)] hover:text-[#f0f0f0]'
                }`}
              >
                {moreStatusActive ? STATUS_LABELS[statusFilter as DeliveryStatus] : 'More'}
                <span className="text-[10px] ml-0.5">▾</span>
              </button>
              {showMoreStatus && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-xl p-1.5 shadow-xl min-w-[150px]">
                  {MORE_STATUS.map((s) => {
                    const count = allDeliveries.filter((d) => d.status === s).length;
                    return (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setShowMoreStatus(false); }}
                        className={`w-full text-left flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-xs transition-colors ${
                          statusFilter === s ? 'bg-[#1a1a1a] text-[#f0f0f0]' : 'text-[#a1a4a5] hover:bg-[#111] hover:text-[#f0f0f0]'
                        }`}
                      >
                        <span>{STATUS_LABELS[s]}</span>
                        <span className="opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl">
              <span className="text-xs text-[#f0f0f0] font-medium flex-1">{selectedCount} selected</span>
              {cancelableCount > 0 && (
                <button onClick={handleBulkCancel} disabled={bulkCanceling} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#a85858] border border-[rgba(135,55,55,0.3)] rounded-lg hover:bg-[rgba(135,55,55,0.08)] transition-colors disabled:opacity-50">
                  <Danger size={13} color="currentColor" />
                  {bulkCanceling ? 'Canceling…' : `Cancel (${cancelableCount})`}
                </button>
              )}
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#a1a4a5] border border-[rgba(255,255,255,0.08)] rounded-lg hover:text-[#f0f0f0] transition-colors">
                <DocumentDownload size={13} color="currentColor" />
                Export
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[#555] hover:text-[#a1a4a5] transition-colors">
                <CloseSquare size={18} color="currentColor" />
              </button>
            </div>
          )}

          {/* Count */}
          <p className="text-[#555] text-xs">Showing {filteredDeliveries.length} of {allDeliveries.length} deliveries</p>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl h-14 animate-pulse" />)}</div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-10 text-center">
              <p className="text-3xl mb-3">📦</p>
              <p className="text-[#f0f0f0] font-medium">No deliveries found</p>
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
              {/* DESKTOP TABLE */}
              <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#111]">
                      <th className="px-3 py-3 w-8">
                        <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleSelectAll} />
                      </th>
                      {COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="text-left text-[#555] text-xs font-medium px-3 py-3 whitespace-nowrap cursor-pointer hover:text-[#a1a4a5] select-none"
                        >
                          {col.label}
                          <SortIndicator field={col.key} />
                        </th>
                      ))}
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeliveries.map((d) => {
                      const canEdit = d.status === 'pending';
                      const canCancel = d.status === 'pending';
                      const isFailed = d.status === 'delivery_failed';
                      const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                      return (
                        <tr
                          key={d.id}
                          className="group border-b border-[#1A1A1A] last:border-0 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                          onClick={() => openView(d.id)}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.has(d.id)} onChange={() => toggleSelect(d.id)} />
                          </td>
                          {visibleCols.has('order_number') && (
                            <td className="px-3 py-3">
                              {d.order_number
                                ? <span className="font-mono text-xs text-[#F2FF66]/70">{d.order_number}</span>
                                : <span className="text-[#333] text-xs">—</span>}
                            </td>
                          )}
                          {visibleCols.has('tracking_id') && (
                            <td className="px-3 py-3">
                              <span className="font-mono text-xs text-[#a1a4a5]">{d.id}</span>
                            </td>
                          )}
                          {visibleCols.has('status') && (
                            <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                          )}
                          {visibleCols.has('recipient') && (
                            <td className="px-3 py-3 max-w-[150px]">
                              <p className="text-xs text-[#f0f0f0] truncate">{d.recipient_name}</p>
                              <p className="text-[10px] text-[#555] truncate">{d.recipient_phone}</p>
                            </td>
                          )}
                          {visibleCols.has('route') && (
                            <td className="px-3 py-3 max-w-[200px]">
                              <p className="text-xs text-[#a1a4a5] truncate">{d.pickup_area} → {d.dropoff_area}</p>
                            </td>
                          )}
                          {visibleCols.has('fee') && (
                            <td className="px-3 py-3 text-xs text-[#a1a4a5] whitespace-nowrap">
                              {d.fee != null ? `₦${d.fee.toLocaleString()}` : '—'}
                            </td>
                          )}
                          {visibleCols.has('date') && (
                            <td className="px-3 py-3 text-xs text-[#a1a4a5] whitespace-nowrap">{fmtDate(d.created_at)}</td>
                          )}
                          {visibleCols.has('pickup_date') && (
                            <td className="px-3 py-3 text-xs text-[#a1a4a5] whitespace-nowrap">
                              {d.pickup_date ? fmtDate(d.pickup_date) : '—'}
                            </td>
                          )}
                          {visibleCols.has('package') && (
                            <td className="px-3 py-3 max-w-[120px]">
                              <p className="text-xs text-[#a1a4a5] truncate">{d.package_description || '—'}</p>
                            </td>
                          )}
                          {visibleCols.has('payment') && (
                            <td className="px-3 py-3 text-xs text-[#a1a4a5]">
                              {PAYMENT_LABELS[d.payment_method] || d.payment_method}
                            </td>
                          )}
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {withinWindow && (
                                <button onClick={() => setReattemptOrder(d)} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#F2FF66] text-[#000000] hover:bg-[#e8f55c] transition-colors whitespace-nowrap">
                                  Reattempt
                                </button>
                              )}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ActionBtn title="View details" onClick={() => openView(d.id)}><Eye size={16} color="currentColor" /></ActionBtn>
                                <ActionBtn title={canEdit ? 'Edit' : 'Cannot edit (not pending)'} onClick={() => setEditOrder(d)} disabled={!canEdit}><Edit2 size={16} color="currentColor" /></ActionBtn>
                                <ActionBtn title={canCancel ? 'Cancel delivery' : 'Cannot cancel'} variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}><Trash size={16} color="currentColor" /></ActionBtn>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden space-y-2">
                {filteredDeliveries.map((d) => {
                  const canEdit = d.status === 'pending';
                  const canCancel = d.status === 'pending';
                  const isFailed = d.status === 'delivery_failed';
                  const withinWindow = isFailed && (Date.now() - new Date(d.updated_at).getTime()) < REATTEMPT_WINDOW_MS;
                  return (
                    <div key={d.id} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(d.id)} onChange={() => toggleSelect(d.id)} />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(d.id)}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                              {d.order_number && <span className="font-mono text-[10px] text-[#F2FF66]/70 flex-shrink-0">{d.order_number}</span>}
                              <span className="font-mono text-xs text-[#a1a4a5] truncate">{d.id}</span>
                            </div>
                            <StatusBadge status={d.status} />
                          </div>
                          <p className="text-sm text-[#f0f0f0] truncate">{d.recipient_name}</p>
                          <p className="text-xs text-[#555] truncate mt-0.5">{d.pickup_area} → {d.dropoff_area}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {d.fee != null && <span className="text-xs text-[#a1a4a5]">₦{d.fee.toLocaleString()}</span>}
                            <span className="text-xs text-[#555]">{fmtDate(d.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {withinWindow && (
                        <button onClick={() => setReattemptOrder(d)} className="w-full mt-3 py-2 rounded-lg text-xs font-semibold bg-[#F2FF66] text-[#000000]">
                          Request Reattempt (fee applies)
                        </button>
                      )}
                      <div className="flex items-center gap-1 border-t border-[rgba(255,255,255,0.06)] pt-2 mt-2">
                        <ActionBtn title="View" onClick={() => openView(d.id)}><Eye size={16} color="currentColor" /></ActionBtn>
                        <ActionBtn title="Edit" onClick={() => setEditOrder(d)} disabled={!canEdit}><Edit2 size={16} color="currentColor" /></ActionBtn>
                        <ActionBtn title="Cancel" variant="danger" onClick={() => setCancelOrder(d)} disabled={!canCancel}><Trash size={16} color="currentColor" /></ActionBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ======= DRAFTS TAB ======= */}
      {activeTab === 'drafts' && (
        draftOrders.length === 0 ? (
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-10 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-[#f0f0f0] font-medium">No saved drafts</p>
            <p className="text-[#a1a4a5] text-sm mt-1">Orders you save as drafts will appear here</p>
            <Link href="/customer/orders/create" className="inline-block mt-4 border border-[rgba(255,255,255,0.12)] text-[#f0f0f0] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              Create Order
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#111]">
                    {['Order #', 'Pickup Area', 'Items', 'Date Saved', 'Est. Fee', ''].map((h) => (
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
                      <td className="px-4 py-3 text-xs text-[#f0f0f0]">{d.pickup_area || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#a1a4a5]">{d.delivery_count}</td>
                      <td className="px-4 py-3 text-xs text-[#a1a4a5]">{fmtDate(d.updated_at || d.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-[#a1a4a5]">{d.total_fee != null ? `₦${d.total_fee.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn title="Continue editing" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                            <Edit2 size={16} color="currentColor" />
                          </ActionBtn>
                          <ActionBtn title="Delete draft permanently" variant="danger" onClick={() => setDeleteDraft({ orderNumber: d.order_number, orderId: d.id })}>
                            <Trash size={16} color="currentColor" />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {draftOrders.map((d) => (
                <div key={d.order_number} className="bg-[#070707] border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-[#aa8040]">{d.order_number}</span>
                      <span className="ml-2 text-[9px] bg-[rgba(150,105,35,0.18)] text-[#aa8040] border border-[rgba(150,105,35,0.25)] px-1.5 py-0.5 rounded-full font-medium uppercase">Draft</span>
                      <p className="text-sm text-[#f0f0f0] mt-1">{d.pickup_area} · {d.delivery_count} item{d.delivery_count !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-[#a1a4a5] mt-0.5">{fmtDate(d.updated_at || d.created_at)}{d.total_fee != null ? ` · ₦${d.total_fee.toLocaleString()}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ActionBtn title="Continue editing" onClick={() => router.push(`/customer/orders/create?draft=${d.order_number}`)}>
                        <Edit2 size={16} color="currentColor" />
                      </ActionBtn>
                      <ActionBtn title="Delete draft" variant="danger" onClick={() => setDeleteDraft({ orderNumber: d.order_number, orderId: d.id })}>
                        <Trash size={16} color="currentColor" />
                      </ActionBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* ======= MODALS ======= */}
      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-[#a1a4a5] text-sm">Loading…</div>
        </div>
      )}
      {viewOrder && <ViewModal delivery={viewOrder} onClose={() => setViewOrder(null)} />}
      {editOrder && (
        <EditModal order={editOrder} onClose={() => setEditOrder(null)} onSaved={(updated) => { applyDeliveryUpdate(updated); setEditOrder(null); }} />
      )}
      {cancelOrder && (
        <CancelModal order={cancelOrder} onClose={() => setCancelOrder(null)} onCanceled={(id) => { applyDeliveryCancel(id); setCancelOrder(null); }} />
      )}
      {reattemptOrder && (
        <ReattemptModal order={reattemptOrder} onClose={() => setReattemptOrder(null)} onDone={(updated) => { applyDeliveryUpdate(updated); setReattemptOrder(null); }} />
      )}
      {deleteDraft && (
        <DeleteDraftModal
          orderNumber={deleteDraft.orderNumber}
          orderId={deleteDraft.orderId}
          onClose={() => setDeleteDraft(null)}
          onDeleted={() => { setDeleteDraft(null); fetchOrders(); }}
        />
      )}
    </div>
  );
}
