'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AddressInput from '@/components/AddressInput';
import {
  LAGOS_ZONES,
  PAYMENT_LABELS,
  PaymentMethod,
  isValidNigerianPhone,
} from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Styling constants                                                   */
/* ------------------------------------------------------------------ */

const inputClass =
  'w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors';

const selectClass =
  'w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors appearance-none';

/* ------------------------------------------------------------------ */
/*  State interfaces                                                    */
/* ------------------------------------------------------------------ */

interface PickupState {
  sender_name: string;
  sender_phone: string;
  pickup_area: string;
  pickup_address: string;
  pickup_date: string;
  payment_method: PaymentMethod;
  is_express: boolean;
}

interface DeliveryItem {
  _id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  dropoff_area: string;
  dropoff_address: string;
  package_description: string;
  package_weight: string;
  estimated_fee?: number;
}

interface EstimateEntry {
  pickup_area: string;
  dropoff_area: string;
  fee: number;
}

interface Estimates {
  estimates: EstimateEntry[];
  total: number;
}

/* CSV preview row type */
interface CsvPreviewRow {
  _id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  dropoff_area: string;
  dropoff_address: string;
  package_description: string;
  package_weight: string;
  _error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('customer_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function emptyDelivery(): DeliveryItem {
  return {
    _id: generateId(),
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    dropoff_area: '',
    dropoff_address: '',
    package_description: '',
    package_weight: '',
  };
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                               */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[#F2FF66] font-semibold text-sm uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

function Field({
  label,
  htmlFor,
  children,
  optional,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-gray-400 text-xs font-medium">
        {label}
        {optional && <span className="text-gray-600 ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function ZoneSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        required
      >
        <option value="">Select area…</option>
        {Object.entries(LAGOS_ZONES).map(([group, zones]) => (
          <optgroup key={group} label={group}>
            {(zones as readonly string[]).map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
        ▼
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estimate Summary Panel                                              */
/* ------------------------------------------------------------------ */

interface EstimateSummaryProps {
  pickup: PickupState;
  deliveries: DeliveryItem[];
  estimates: Estimates;
  isMulti: boolean;
  onPlaceOrder: () => void;
  onSaveDraft: () => void;
  placing: boolean;
  savingDraft: boolean;
}

function EstimateSummary({
  pickup,
  deliveries,
  estimates,
  isMulti,
  onPlaceOrder,
  onSaveDraft,
  placing,
  savingDraft,
}: EstimateSummaryProps) {
  const displayDeliveries = isMulti ? deliveries : [deliveries[0]];

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-5">
      <h3 className="text-[#FAFAFA] font-semibold text-base">Estimate Summary</h3>

      {/* Pickup Details */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[#FAFAFA] font-bold text-sm">{pickup.sender_name || '—'}</p>
        <p className="text-gray-400 text-xs">{pickup.pickup_address || pickup.pickup_area}</p>
        <p className="text-gray-400 text-xs">{formatDate(pickup.pickup_date)}</p>
      </div>

      <div className="border-t border-[#2A2A2A]" />

      {/* Delivery groups */}
      {displayDeliveries.map((d, idx) => {
        const fee = estimates.estimates[idx]?.fee ?? 0;
        return (
          <div key={d._id} className="flex flex-col gap-1.5">
            {isMulti && (
              <p className="text-[#F2FF66] text-xs font-semibold uppercase tracking-wider mb-1">
                Delivery {idx + 1}
              </p>
            )}
            {!isMulti && (
              <p className="text-[#F2FF66] text-xs font-semibold uppercase tracking-wider mb-1">
                Delivery Details
              </p>
            )}
            <p className="text-[#FAFAFA] font-bold text-sm">{d.recipient_name || '—'}</p>
            <p className="text-gray-400 text-xs">{d.dropoff_address || d.dropoff_area}</p>
            <p className="text-gray-400 text-xs">{d.recipient_phone}</p>
            {d.package_weight && (
              <p className="text-gray-400 text-xs">{d.package_weight} kg</p>
            )}
            {d.package_description && (
              <p className="text-gray-400 text-xs truncate max-w-xs">{d.package_description}</p>
            )}
            <p className="text-[#F2FF66] font-bold text-lg mt-1">{formatCurrency(fee)}</p>
            {idx < displayDeliveries.length - 1 && (
              <div className="border-t border-[#2A2A2A] mt-2" />
            )}
          </div>
        );
      })}

      {/* Grand total for multi */}
      {isMulti && displayDeliveries.length > 1 && (
        <>
          <div className="border-t border-[#2A2A2A]" />
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Grand Total</p>
            <p className="text-[#F2FF66] font-bold text-xl">{formatCurrency(estimates.total)}</p>
          </div>
        </>
      )}

      <div className="border-t border-[#2A2A2A]" />

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={placing || savingDraft}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#F2FF66] text-[#0A0A0A] hover:bg-[#e8f550] transition-colors disabled:opacity-60"
        >
          {placing ? 'Placing Order…' : 'Place Order'}
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={placing || savingDraft}
          className="w-full py-3 rounded-xl font-semibold text-sm border border-[#2A2A2A] text-[#FAFAFA] hover:border-[#888888] transition-colors disabled:opacity-60"
        >
          {savingDraft ? 'Saving…' : 'Save as Draft'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estimate Placeholder Panel (desktop right col when not estimated)   */
/* ------------------------------------------------------------------ */

function EstimatePlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#191314] p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <p className="text-gray-500 text-sm">
        Fill in the form and click <span className="text-[#F2FF66]">Estimate Cost</span> to see a
        price breakdown here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Bulk Upload Preview                                             */
/* ------------------------------------------------------------------ */

interface CsvPreviewTableProps {
  rows: CsvPreviewRow[];
  onUpdateRow: (id: string, field: keyof CsvPreviewRow, value: string) => void;
  onDeleteRow: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function CsvPreviewTable({
  rows,
  onUpdateRow,
  onDeleteRow,
  onConfirm,
  onCancel,
}: CsvPreviewTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[#FAFAFA] font-semibold text-sm">
          CSV Preview — {rows.length} row{rows.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs border border-[#2A2A2A] text-gray-400 hover:text-[#FAFAFA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#F2FF66] text-[#0A0A0A] font-semibold hover:bg-[#e8f550] transition-colors"
          >
            Confirm Import
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#111]">
              {['Recipient Name', 'Phone', 'Area', 'Address', 'Description', 'Weight (kg)', ''].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.recipient_name}
                    onChange={(e) => onUpdateRow(row._id, 'recipient_name', e.target.value)}
                    className="w-32 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.recipient_phone}
                    onChange={(e) => onUpdateRow(row._id, 'recipient_phone', e.target.value)}
                    className="w-28 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.dropoff_area}
                    onChange={(e) => onUpdateRow(row._id, 'dropoff_area', e.target.value)}
                    className="w-28 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.dropoff_address}
                    onChange={(e) => onUpdateRow(row._id, 'dropoff_address', e.target.value)}
                    className="w-40 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.package_description}
                    onChange={(e) => onUpdateRow(row._id, 'package_description', e.target.value)}
                    className="w-40 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.package_weight}
                    onChange={(e) => onUpdateRow(row._id, 'package_weight', e.target.value)}
                    className="w-16 bg-transparent border-b border-gray-700 text-[#FAFAFA] text-xs py-0.5 focus:outline-none focus:border-[#F2FF66]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row._id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pickup Section                                                      */
/* ------------------------------------------------------------------ */

interface PickupSectionProps {
  pickup: PickupState;
  onChange: (field: keyof PickupState, value: string | boolean) => void;
}

function PickupSection({ pickup, onChange }: PickupSectionProps) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-4">
      <SectionHeading>Pickup Details</SectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sender Name" htmlFor="sender_name">
          <input
            id="sender_name"
            type="text"
            value={pickup.sender_name}
            onChange={(e) => onChange('sender_name', e.target.value)}
            className={inputClass}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Sender Phone" htmlFor="sender_phone">
          <input
            id="sender_phone"
            type="tel"
            value={pickup.sender_phone}
            onChange={(e) => onChange('sender_phone', e.target.value)}
            className={inputClass}
            placeholder="08012345678"
            required
          />
        </Field>

        <Field label="Pickup Area" htmlFor="pickup_area">
          <ZoneSelect
            id="pickup_area"
            value={pickup.pickup_area}
            onChange={(v) => onChange('pickup_area', v)}
          />
        </Field>

        <Field label="Pickup Date" htmlFor="pickup_date">
          <input
            id="pickup_date"
            type="date"
            value={pickup.pickup_date}
            min={todayString()}
            onChange={(e) => onChange('pickup_date', e.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Pickup Address" htmlFor="pickup_address">
          <AddressInput
            id="pickup_address"
            value={pickup.pickup_address}
            onChange={(v) => onChange('pickup_address', v)}
            placeholder="Street address or landmark"
          />
        </Field>

        <Field label="Payment Method" htmlFor="payment_method">
          <div className="relative">
            <select
              id="payment_method"
              value={pickup.payment_method}
              onChange={(e) => onChange('payment_method', e.target.value as PaymentMethod)}
              className={selectClass}
            >
              {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              ▼
            </span>
          </div>
        </Field>
      </div>

      {/* Express toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => onChange('is_express', !pickup.is_express)}
          className={`relative w-11 h-6 rounded-full transition-colors ${pickup.is_express ? 'bg-[#F2FF66]' : 'bg-gray-700'}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-[#0A0A0A] transition-all ${pickup.is_express ? 'left-6' : 'left-1'}`}
          />
        </div>
        <span className="text-sm text-[#FAFAFA]">Express Delivery</span>
        <span className="text-xs text-gray-500">(faster, higher rate)</span>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Delivery Form                                                */
/* ------------------------------------------------------------------ */

interface SingleDeliveryFormProps {
  delivery: DeliveryItem;
  onChange: (field: keyof DeliveryItem, value: string) => void;
}

function SingleDeliveryForm({ delivery, onChange }: SingleDeliveryFormProps) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-4">
      <SectionHeading>Delivery Details</SectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Recipient Name" htmlFor="recipient_name">
          <input
            id="recipient_name"
            type="text"
            value={delivery.recipient_name}
            onChange={(e) => onChange('recipient_name', e.target.value)}
            className={inputClass}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Recipient Phone" htmlFor="recipient_phone">
          <input
            id="recipient_phone"
            type="tel"
            value={delivery.recipient_phone}
            onChange={(e) => onChange('recipient_phone', e.target.value)}
            className={inputClass}
            placeholder="08012345678"
            required
          />
        </Field>

        <Field label="Recipient Email" htmlFor="recipient_email" optional>
          <input
            id="recipient_email"
            type="email"
            value={delivery.recipient_email}
            onChange={(e) => onChange('recipient_email', e.target.value)}
            className={inputClass}
            placeholder="email@example.com"
          />
        </Field>

        <Field label="Dropoff Area" htmlFor="dropoff_area">
          <ZoneSelect
            id="dropoff_area"
            value={delivery.dropoff_area}
            onChange={(v) => onChange('dropoff_area', v)}
          />
        </Field>

        <Field label="Dropoff Address" htmlFor="dropoff_address">
          <AddressInput
            id="dropoff_address"
            value={delivery.dropoff_address}
            onChange={(v) => onChange('dropoff_address', v)}
            placeholder="Street address or landmark"
          />
        </Field>

        <Field label="Package Weight (kg)" htmlFor="package_weight">
          <input
            id="package_weight"
            type="number"
            min="0.1"
            step="0.1"
            value={delivery.package_weight}
            onChange={(e) => onChange('package_weight', e.target.value)}
            className={inputClass}
            placeholder="e.g. 1.5"
            required
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Package Description" htmlFor="package_description">
            <input
              id="package_description"
              type="text"
              value={delivery.package_description}
              onChange={(e) => onChange('package_description', e.target.value)}
              className={inputClass}
              placeholder="₦25,000 – Sneakers – Yes Insurance – Apt 2B"
            />
            <p className="text-gray-600 text-xs mt-1">
              Format: Item value, description, insurance request, delivery instructions
              <br />
              Example: ₦25,000 – Sneakers – Yes Insurance – Apt 2B
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi Delivery Block                                                */
/* ------------------------------------------------------------------ */

interface MultiDeliveryBlockProps {
  delivery: DeliveryItem;
  index: number;
  total: number;
  onChange: (field: keyof DeliveryItem, value: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function MultiDeliveryBlock({
  delivery,
  index,
  total,
  onChange,
  onRemove,
  onDuplicate,
}: MultiDeliveryBlockProps) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionHeading>Delivery {index + 1}</SectionHeading>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="px-3 py-1.5 rounded-lg text-xs border border-[#2A2A2A] text-gray-400 hover:text-[#F2FF66] hover:border-[#F2FF66] transition-colors"
          >
            Duplicate
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 rounded-lg text-xs border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Recipient Name" htmlFor={`r_name_${delivery._id}`}>
          <input
            id={`r_name_${delivery._id}`}
            type="text"
            value={delivery.recipient_name}
            onChange={(e) => onChange('recipient_name', e.target.value)}
            className={inputClass}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Recipient Phone" htmlFor={`r_phone_${delivery._id}`}>
          <input
            id={`r_phone_${delivery._id}`}
            type="tel"
            value={delivery.recipient_phone}
            onChange={(e) => onChange('recipient_phone', e.target.value)}
            className={inputClass}
            placeholder="08012345678"
            required
          />
        </Field>

        <Field label="Recipient Email" htmlFor={`r_email_${delivery._id}`} optional>
          <input
            id={`r_email_${delivery._id}`}
            type="email"
            value={delivery.recipient_email}
            onChange={(e) => onChange('recipient_email', e.target.value)}
            className={inputClass}
            placeholder="email@example.com"
          />
        </Field>

        <Field label="Dropoff Area" htmlFor={`r_area_${delivery._id}`}>
          <ZoneSelect
            id={`r_area_${delivery._id}`}
            value={delivery.dropoff_area}
            onChange={(v) => onChange('dropoff_area', v)}
          />
        </Field>

        <Field label="Dropoff Address" htmlFor={`r_addr_${delivery._id}`}>
          <AddressInput
            id={`r_addr_${delivery._id}`}
            value={delivery.dropoff_address}
            onChange={(v) => onChange('dropoff_address', v)}
            placeholder="Street address or landmark"
          />
        </Field>

        <Field label="Package Weight (kg)" htmlFor={`r_weight_${delivery._id}`}>
          <input
            id={`r_weight_${delivery._id}`}
            type="number"
            min="0.1"
            step="0.1"
            value={delivery.package_weight}
            onChange={(e) => onChange('package_weight', e.target.value)}
            className={inputClass}
            placeholder="e.g. 1.5"
            required
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Package Description" htmlFor={`r_desc_${delivery._id}`}>
            <input
              id={`r_desc_${delivery._id}`}
              type="text"
              value={delivery.package_description}
              onChange={(e) => onChange('package_description', e.target.value)}
              className={inputClass}
              placeholder="₦25,000 – Sneakers – Yes Insurance – Apt 2B"
            />
            <p className="text-gray-600 text-xs mt-1">
              Format: Item value, description, insurance request, delivery instructions
              <br />
              Example: ₦25,000 – Sneakers – Yes Insurance – Apt 2B
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function CreateOrderPage() {
  const router = useRouter();

  // --- Global shared state ---
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const [pickup, setPickup] = useState<PickupState>({
    sender_name: '',
    sender_phone: '',
    pickup_area: '',
    pickup_address: '',
    pickup_date: todayString(),
    payment_method: 'sender_pays',
    is_express: false,
  });
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([emptyDelivery()]);
  const [estimates, setEstimates] = useState<Estimates | null>(null);
  const [hasEstimated, setHasEstimated] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Error / status
  const [error, setError] = useState('');
  const [estimating, setEstimating] = useState(false);

  // CSV upload state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  /* ---- Auto-fill from profile ---- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customer/profile', { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const profile = data.customer ?? data;
        setPickup((p) => ({
          ...p,
          sender_name: profile.name ?? p.sender_name,
          sender_phone: profile.phone ?? p.sender_phone,
          pickup_area: profile.default_pickup_area ?? p.pickup_area,
          pickup_address: profile.default_pickup_address ?? p.pickup_address,
        }));
      } catch {
        // silently ignore
      }
    })();
  }, []);

  /* ---- Pickup field handler ---- */
  const handlePickupChange = useCallback(
    (field: keyof PickupState, value: string | boolean) => {
      setPickup((p) => ({ ...p, [field]: value }));
      setHasEstimated(false);
    },
    []
  );

  /* ---- Delivery field handler (single or multi by index) ---- */
  const handleDeliveryChange = useCallback(
    (idx: number, field: keyof DeliveryItem, value: string) => {
      setDeliveries((ds) =>
        ds.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
      );
      setHasEstimated(false);
    },
    []
  );

  /* ---- Add delivery ---- */
  const addDelivery = useCallback(() => {
    setDeliveries((ds) => [...ds, emptyDelivery()]);
    setHasEstimated(false);
  }, []);

  /* ---- Remove delivery ---- */
  const removeDelivery = useCallback((idx: number) => {
    setDeliveries((ds) => ds.filter((_, i) => i !== idx));
    setHasEstimated(false);
  }, []);

  /* ---- Duplicate delivery ---- */
  const duplicateDelivery = useCallback((idx: number) => {
    setDeliveries((ds) => {
      const copy = { ...ds[idx], _id: generateId() };
      const next = [...ds];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setHasEstimated(false);
  }, []);

  /* ---- Tab switch (never resets deliveries) ---- */
  const handleTabSwitch = useCallback((tab: 'single' | 'multi') => {
    setActiveTab(tab);
    // ensure at least 1 delivery exists
    setDeliveries((ds) => (ds.length === 0 ? [emptyDelivery()] : ds));
  }, []);

  /* ---- Validation ---- */
  const validate = useCallback((): string => {
    if (!pickup.sender_name.trim()) return 'Sender name is required.';
    if (!isValidNigerianPhone(pickup.sender_phone))
      return 'Invalid sender phone number.';
    if (!pickup.pickup_area) return 'Pickup area is required.';
    if (!pickup.pickup_date) return 'Pickup date is required.';
    if (pickup.pickup_date < todayString()) return 'Pickup date must be today or in the future.';

    const items = activeTab === 'single' ? [deliveries[0]] : deliveries;
    for (let i = 0; i < items.length; i++) {
      const d = items[i];
      const label = activeTab === 'multi' ? ` (Delivery ${i + 1})` : '';
      if (!d.recipient_name.trim()) return `Recipient name is required${label}.`;
      if (!isValidNigerianPhone(d.recipient_phone))
        return `Invalid recipient phone number${label}.`;
      if (!d.dropoff_area) return `Dropoff area is required${label}.`;
      const w = parseFloat(d.package_weight);
      if (!d.package_weight || isNaN(w) || w <= 0)
        return `Package weight must be greater than 0${label}.`;
    }
    return '';
  }, [pickup, deliveries, activeTab]);

  /* ---- Estimate ---- */
  const handleEstimate = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setEstimating(true);
    try {
      const items = activeTab === 'single' ? [deliveries[0]] : deliveries;
      const payload = {
        deliveries: items.map((d) => ({
          pickup_area: pickup.pickup_area,
          dropoff_area: d.dropoff_area,
          is_express: pickup.is_express,
        })),
      };
      const res = await fetch('/api/customer/deliveries/estimate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to estimate cost.');
        return;
      }
      const data: Estimates = await res.json();
      setEstimates(data);
      setHasEstimated(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setEstimating(false);
    }
  }, [validate, pickup, deliveries, activeTab]);

  /* ---- Submit order ---- */
  const submitOrder = useCallback(
    async (isDraft: boolean) => {
      if (!estimates) return;
      if (isDraft) setSavingDraft(true);
      else setPlacing(true);
      setError('');

      try {
        const items = activeTab === 'single' ? [deliveries[0]] : deliveries;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const deliveryPayload = items.map(({ _id: _removed, ...rest }) => rest);

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            pickup: { ...pickup },
            deliveries: deliveryPayload,
            is_draft: isDraft,
            total_fee: estimates.total,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Failed to place order.');
          return;
        }

        const data = await res.json();
        const orderNumber: string = data.order_number ?? data.id ?? '';
        const count = items.length;

        if (isDraft) {
          router.push('/customer/orders?saved=draft');
        } else {
          router.push(
            `/customer/orders/create/confirmation?order_number=${encodeURIComponent(orderNumber)}&count=${count}`
          );
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setPlacing(false);
        setSavingDraft(false);
      }
    },
    [estimates, pickup, deliveries, activeTab, router]
  );

  /* ---- CSV parse & preview ---- */
  const handleCsvFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row.');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows: CsvPreviewRow[] = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const get = (name: string) => cols[headers.indexOf(name)] ?? '';
        return {
          _id: generateId(),
          recipient_name: get('recipient_name') || get('name'),
          recipient_phone: get('recipient_phone') || get('phone'),
          recipient_email: get('recipient_email') || get('email'),
          dropoff_area: get('dropoff_area') || get('area'),
          dropoff_address: get('dropoff_address') || get('address'),
          package_description: get('package_description') || get('description'),
          package_weight: get('package_weight') || get('weight'),
        };
      });
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleCsvUpdateRow = useCallback(
    (id: string, field: keyof CsvPreviewRow, value: string) => {
      setCsvPreview((rows) =>
        rows
          ? rows.map((r) => (r._id === id ? { ...r, [field]: value } : r))
          : rows
      );
    },
    []
  );

  const handleCsvDeleteRow = useCallback((id: string) => {
    setCsvPreview((rows) => (rows ? rows.filter((r) => r._id !== id) : rows));
  }, []);

  const handleCsvConfirm = useCallback(() => {
    if (!csvPreview) return;
    const newDeliveries: DeliveryItem[] = csvPreview.map((r) => ({
      _id: generateId(),
      recipient_name: r.recipient_name,
      recipient_phone: r.recipient_phone,
      recipient_email: r.recipient_email,
      dropoff_area: r.dropoff_area,
      dropoff_address: r.dropoff_address,
      package_description: r.package_description,
      package_weight: r.package_weight,
    }));
    setDeliveries((ds) => {
      const base = ds.filter(
        (d) =>
          d.recipient_name || d.recipient_phone || d.dropoff_area || d.dropoff_address
      );
      return [...base, ...newDeliveries];
    });
    setCsvPreview(null);
    setActiveTab('multi');
    setHasEstimated(false);
  }, [csvPreview]);

  /* ---- Derived values ---- */
  const isMulti = activeTab === 'multi';
  const activeDeliveries = isMulti ? deliveries : [deliveries[0]];

  /* ====================================================================
     RENDER
  ==================================================================== */

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0A0A0A] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/customer/orders" className="text-gray-500 hover:text-[#FAFAFA] transition-colors text-sm">
            ← Back
          </Link>
          <h1 className="text-[#FAFAFA] font-bold text-lg">Create Order</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-[#191314] border border-[#2A2A2A] rounded-xl w-fit mb-8">
          <button
            type="button"
            onClick={() => handleTabSwitch('single')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'single'
                ? 'bg-[#F2FF66] text-[#0A0A0A]'
                : 'text-gray-400 hover:text-[#FAFAFA]'
            }`}
          >
            Single Delivery
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('multi')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'multi'
                ? 'bg-[#F2FF66] text-[#0A0A0A]'
                : 'text-gray-400 hover:text-[#FAFAFA]'
            }`}
          >
            Multiple Deliveries
          </button>
        </div>

        {/* Two-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 flex flex-col gap-6">
          {/* ======= LEFT COLUMN: Form ======= */}
          <div className="flex flex-col gap-6">
            {/* Pickup section */}
            <PickupSection pickup={pickup} onChange={handlePickupChange} />

            {/* CSV Bulk Upload (multi mode only) */}
            {isMulti && !csvPreview && (
              <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-3">
                <p className="text-gray-400 text-sm font-medium">Bulk Upload via CSV</p>
                <p className="text-gray-600 text-xs">
                  Columns: recipient_name, recipient_phone, recipient_email, dropoff_area,
                  dropoff_address, package_description, package_weight
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCsvFile(f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-gray-400 hover:text-[#F2FF66] hover:border-[#F2FF66] transition-colors"
                  >
                    Upload CSV
                  </button>
                </div>
              </div>
            )}

            {/* CSV Preview Table */}
            {isMulti && csvPreview && (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5">
                <CsvPreviewTable
                  rows={csvPreview}
                  onUpdateRow={handleCsvUpdateRow}
                  onDeleteRow={handleCsvDeleteRow}
                  onConfirm={handleCsvConfirm}
                  onCancel={() => setCsvPreview(null)}
                />
              </div>
            )}

            {/* Delivery forms */}
            {!isMulti && (
              <SingleDeliveryForm
                delivery={deliveries[0]}
                onChange={(field, value) => handleDeliveryChange(0, field, value)}
              />
            )}

            {isMulti && (
              <div className="flex flex-col gap-4">
                {deliveries.map((d, idx) => (
                  <MultiDeliveryBlock
                    key={d._id}
                    delivery={d}
                    index={idx}
                    total={deliveries.length}
                    onChange={(field, value) => handleDeliveryChange(idx, field, value)}
                    onRemove={() => removeDelivery(idx)}
                    onDuplicate={() => duplicateDelivery(idx)}
                  />
                ))}

                <button
                  type="button"
                  onClick={addDelivery}
                  className="w-full py-3 rounded-xl border border-dashed border-[#2A2A2A] text-gray-400 hover:text-[#F2FF66] hover:border-[#F2FF66] text-sm font-medium transition-colors"
                >
                  + Add Another Delivery
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Estimate button */}
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating}
              className="w-full py-4 rounded-xl font-bold text-sm bg-[#F2FF66] text-[#0A0A0A] hover:bg-[#e8f550] transition-colors disabled:opacity-60"
            >
              {estimating ? 'Estimating…' : 'Estimate Cost'}
            </button>

            {/* Mobile: Estimate Summary card (only when hasEstimated) */}
            {hasEstimated && estimates && (
              <div className="lg:hidden">
                <EstimateSummary
                  pickup={pickup}
                  deliveries={activeDeliveries}
                  estimates={estimates}
                  isMulti={isMulti}
                  onPlaceOrder={() => submitOrder(false)}
                  onSaveDraft={() => submitOrder(true)}
                  placing={placing}
                  savingDraft={savingDraft}
                />
              </div>
            )}
          </div>

          {/* ======= RIGHT COLUMN: Sticky estimate panel (desktop only) ======= */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              {hasEstimated && estimates ? (
                <EstimateSummary
                  pickup={pickup}
                  deliveries={activeDeliveries}
                  estimates={estimates}
                  isMulti={isMulti}
                  onPlaceOrder={() => submitOrder(false)}
                  onSaveDraft={() => submitOrder(true)}
                  placing={placing}
                  savingDraft={savingDraft}
                />
              ) : (
                <EstimatePlaceholder />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
