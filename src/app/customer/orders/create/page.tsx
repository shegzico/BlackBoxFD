'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  draftOrderNumber?: string | null;
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
  draftOrderNumber,
}: EstimateSummaryProps) {
  const displayDeliveries = isMulti ? deliveries : [deliveries[0]];
  const subtotal = estimates.total;
  const vat = subtotal * 0.075;
  const total = subtotal + vat;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] flex flex-col h-full">
      {/* Fixed header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#2A2A2A] flex-shrink-0">
        <h3 className="text-[#FAFAFA] font-semibold text-base">Estimate Summary</h3>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Pickup Details */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[#888888] text-[10px] font-semibold uppercase tracking-wider mb-0.5">Pickup</p>
          <p className="text-[#FAFAFA] font-bold text-sm">{pickup.sender_name || '—'}</p>
          <p className="text-gray-400 text-xs">{pickup.pickup_address || pickup.pickup_area}</p>
          <p className="text-gray-400 text-xs">{formatDate(pickup.pickup_date)}</p>
        </div>

        <div className="border-t border-[#2A2A2A]" />

        {/* Delivery entries */}
        {displayDeliveries.map((d, idx) => {
          const fee = estimates.estimates[idx]?.fee ?? 0;
          return (
            <div key={d._id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[#F2FF66] text-xs font-semibold uppercase tracking-wider">
                  {isMulti ? `Delivery ${idx + 1}` : 'Delivery'}
                </p>
                <p className="text-[#F2FF66] font-bold text-sm">{formatCurrency(fee)}</p>
              </div>
              <p className="text-[#FAFAFA] font-bold text-sm">{d.recipient_name || '—'}</p>
              <p className="text-gray-400 text-xs">
                {d.dropoff_address || '—'}{d.dropoff_area ? ` · ${d.dropoff_area}` : ''}
              </p>
              <p className="text-gray-400 text-xs">
                {d.recipient_phone || '—'}{d.package_weight ? ` · ${d.package_weight}kg` : ''}
              </p>
              {d.package_description && (
                <p className="text-gray-500 text-xs line-clamp-2">{d.package_description}</p>
              )}
              {idx < displayDeliveries.length - 1 && (
                <div className="border-t border-[#2A2A2A] mt-2" />
              )}
            </div>
          );
        })}

        <div className="border-t border-[#2A2A2A]" />

        {/* VAT + totals */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Subtotal</p>
            <p className="text-[#FAFAFA] text-sm">{formatCurrency(subtotal)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">VAT included</p>
            <p className="text-[#F2FF66] text-xs font-medium">+ 7.5%</p>
          </div>
        </div>
        <div className="border-t border-[#2A2A2A]" />
        <div className="flex items-center justify-between">
          <p className="text-[#FAFAFA] font-bold text-base">Total</p>
          <p className="text-[#F2FF66] font-bold text-xl">{formatCurrency(total)}</p>
        </div>

        {/* Disclaimer */}
        <p className="text-gray-600 text-xs leading-relaxed">
          Disclaimer: The price is subject to adjustment based on the item&apos;s final weight.
          <br /><br />
          By clicking &quot;Place Order&quot;, you agree to our{' '}
          <span className="text-[#F2FF66] cursor-pointer">Terms and Conditions</span>.
        </p>
      </div>

      {/* Always-visible action buttons */}
      <div className="px-5 py-4 border-t border-[#2A2A2A] flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={placing || savingDraft}
          className="flex-1 py-3 rounded-xl font-semibold text-sm border border-[#2A2A2A] text-[#888888] hover:border-[#F2FF66] transition-colors disabled:opacity-60"
        >
          {savingDraft ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={placing || savingDraft}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#F2FF66] text-[#0A0A0A] hover:bg-[#e8f550] transition-colors disabled:opacity-60"
        >
          {placing ? 'Placing…' : draftOrderNumber ? 'Confirm Order' : 'Place Order'}
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
/*  Compact Delivery Card                                               */
/* ------------------------------------------------------------------ */

interface CompactDeliveryCardProps {
  delivery: DeliveryItem;
  index: number;
  total: number;
  isEditing: boolean;
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onChange: (field: keyof DeliveryItem, value: string) => void;
}

function CompactDeliveryCard({
  delivery,
  index,
  total,
  isEditing,
  isLast,
  onEdit,
  onRemove,
  onChange,
}: CompactDeliveryCardProps) {
  // Last card in list is always expanded
  const expanded = isEditing || isLast;

  if (expanded) {
    return (
      <div className="rounded-xl border border-[#F2FF66]/40 bg-[#191314] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SectionHeading>Delivery {index + 1}</SectionHeading>
          {/* Only show Done button if not the last card */}
          {!isLast && (
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs border border-[#2A2A2A] text-gray-400 hover:text-[#F2FF66] hover:border-[#F2FF66] transition-colors"
            >
              Done
            </button>
          )}
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
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Package Description" htmlFor={`r_desc_${delivery._id}`}>
              <textarea
                id={`r_desc_${delivery._id}`}
                rows={3}
                value={delivery.package_description}
                onChange={(e) => onChange('package_description', e.target.value)}
                className={inputClass + ' resize-none'}
                placeholder="₦25,000 – Sneakers – Yes Insurance – Apt 2B"
              />
              <p className="text-gray-600 text-xs mt-1">
                Format: Item value, description, insurance request (interstate/international only), delivery instructions
                <br />
                Example: ₦25,000 – Sneakers – Yes Insurance – Apt 2B or ₦15,000 – Laptop Bag – No Insurance – Leave with reception
              </p>
            </Field>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-[#FAFAFA] font-bold text-sm truncate">
          {delivery.recipient_name || <span className="text-gray-600">Unnamed Recipient</span>}
        </p>
        <p className="text-gray-500 text-xs truncate">
          {delivery.dropoff_area || '—'} → {delivery.dropoff_address || '—'}
        </p>
        <p className="text-gray-500 text-xs">
          {delivery.recipient_phone || '—'}
          {delivery.package_weight ? ` · ${delivery.package_weight}kg` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Edit button */}
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="p-1.5 rounded-lg text-gray-500 hover:text-[#F2FF66] hover:bg-[#F2FF66]/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
          </svg>
        </button>
        {/* Remove button */}
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag & Drop Bulk Upload Zone                                        */
/* ------------------------------------------------------------------ */

interface BulkUploadZoneProps {
  onFile: (file: File) => void;
  onDownloadTemplate: () => void;
}

function BulkUploadZone({ onFile, onDownloadTemplate }: BulkUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-12 px-6 text-center ${
          isDragging ? 'border-[#F2FF66] bg-[#F2FF66]/5' : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-gray-600'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 ${isDragging ? 'text-[#F2FF66]' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-300 text-sm font-medium">
          Drop your file here or <span className="text-[#F2FF66]">Browse</span>
        </p>
        <p className="text-gray-600 text-xs">Max. file size must be 2MB (Supported format: .XLS, .CSV)</p>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleChange} />
      </div>

      {/* Document sample row */}
      <div className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-[#FAFAFA] text-xs font-semibold">Document Sample</p>
            <p className="text-gray-500 text-[10px]">Download the template and use it as a guide to create yours.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs text-gray-300 hover:text-[#F2FF66] hover:border-[#F2FF66] transition-colors flex-shrink-0"
        >
          Download
        </button>
      </div>

      {/* Field instructions */}
      <div className="rounded-xl border border-[#F2FF66]/20 bg-[#F2FF66]/5 px-4 py-4 flex flex-col gap-2">
        <p className="text-[#F2FF66] text-xs font-bold">Guide for Filling Bulk Upload Template</p>
        <p className="text-gray-400 text-xs">Field Instructions for Bulk Upload Template</p>
        <ul className="flex flex-col gap-1.5 text-xs text-gray-400 list-none">
          <li><span className="text-[#FAFAFA] font-medium">recipient_name</span> → Enter the recipient&apos;s full legal name (first name and surname).</li>
          <li><span className="text-[#FAFAFA] font-medium">recipient_phone</span> → Nigerian phone number (e.g. 08012345678 or +2348012345678).</li>
          <li><span className="text-[#FAFAFA] font-medium">recipient_email</span> → Optional. Recipient&apos;s email address.</li>
          <li><span className="text-[#FAFAFA] font-medium">dropoff_area</span> → Lagos delivery zone (e.g. Victoria Island, Ikeja, Lekki Phase 1).</li>
          <li><span className="text-[#FAFAFA] font-medium">dropoff_address</span> → Provide the complete delivery address.</li>
          <li><span className="text-[#FAFAFA] font-medium">package_weight</span> → Enter the accurate weight in kg (e.g. 1.5). Required for calculating delivery cost.</li>
          <li><span className="text-[#FAFAFA] font-medium">package_description</span> → Describe the item, declare value, indicate insurance, add delivery instructions.</li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulk Preview Cards (after parse)                                   */
/* ------------------------------------------------------------------ */

function revalidateRow(row: CsvPreviewRow): CsvPreviewRow {
  const errors: string[] = [];
  if (!row.recipient_name.trim()) errors.push('Missing name');
  if (!row.recipient_phone.trim()) errors.push('Missing phone');
  if (!row.dropoff_area.trim() && !row.dropoff_address.trim()) errors.push('Missing address');
  if (!row.package_weight.trim() || isNaN(parseFloat(row.package_weight))) errors.push('Missing/invalid weight');
  return { ...row, _error: errors.length > 0 ? errors.join(', ') : undefined };
}

interface BulkPreviewCardsProps {
  rows: CsvPreviewRow[];
  editingId: string | null;
  onSetEditing: (id: string | null) => void;
  onUpdateRow: (id: string, field: keyof CsvPreviewRow, value: string) => void;
  onSaveRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onRemoveAll: (tab: 'valid' | 'invalid') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function BulkPreviewCards({
  rows,
  editingId,
  onSetEditing,
  onUpdateRow,
  onSaveRow,
  onDeleteRow,
  onRemoveAll,
  onConfirm,
  onCancel,
}: BulkPreviewCardsProps) {
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => !!r._error);
  const displayRows = activeTab === 'valid' ? validRows : invalidRows;

  // Edit modal state
  const editingRow = rows.find((r) => r._id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary line */}
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2.5 text-sm">
        Found{' '}
        <span className="text-green-400 font-semibold">{validRows.length} valid</span>
        {' '}and{' '}
        <span className="text-red-400 font-semibold">{invalidRows.length} invalid</span>
        {' '}deliveries.
      </div>

      {/* Tabs + Remove all */}
      <div className="flex items-center justify-between border-b border-[#2A2A2A]">
        <div className="flex">
          {(['valid', 'invalid'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-[#F2FF66] text-[#F2FF66]'
                  : 'border-transparent text-gray-500 hover:text-[#FAFAFA]'
              }`}
            >
              {tab} ({tab === 'valid' ? validRows.length : invalidRows.length})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onRemoveAll(activeTab)}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800/40 hover:border-red-600/40 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove all
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['Full Name', 'Address', 'Phone number', 'Weight', 'Item Desc.', 'Action'].map((h) => (
                <th key={h} className="text-left text-[#888888] text-xs font-medium px-3 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-600 text-xs py-8">No {activeTab} deliveries</td>
              </tr>
            ) : (
              displayRows.map((row) => (
                <tr
                  key={row._id}
                  className={`border-b border-[#1A1A1A] last:border-0 ${row._error ? 'bg-red-900/10' : 'hover:bg-[#1A1A1A]'}`}
                >
                  <td className="px-3 py-3 text-[#FAFAFA] text-xs whitespace-nowrap">
                    {row.recipient_name || <span className="text-gray-600 italic">Missing</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs max-w-[200px]">
                    <p className="truncate">{row.dropoff_address || <span className="text-red-400 italic">Missing</span>}</p>
                    {row.dropoff_area && <p className="text-[#888888] text-[10px] truncate">{row.dropoff_area}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {row.recipient_phone || <span className="text-red-400 italic">Missing</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {row.package_weight ? `${row.package_weight}kg` : <span className="text-red-400 italic">Missing</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs max-w-[160px]">
                    <p className="truncate">{row.package_description || '—'}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSetEditing(row._id)}
                        title="Edit"
                        className="p-1.5 text-[#F2FF66]/60 hover:text-[#F2FF66] hover:bg-[#F2FF66]/10 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row._id)}
                        title="Remove"
                        className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom actions — Import only on Valid tab */}
      {activeTab === 'valid' && (
        <div className="flex flex-col items-end gap-2">
          {invalidRows.length > 0 && (
            <p className="text-xs text-red-400">
              Fix or remove all {invalidRows.length} invalid row{invalidRows.length !== 1 ? 's' : ''} before importing.
            </p>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={validRows.length === 0 || invalidRows.length > 0}
            className="px-5 py-2.5 rounded-xl bg-[#F2FF66] text-[#0A0A0A] font-semibold text-sm hover:bg-[#e8f550] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {validRows.length} deliver{validRows.length === 1 ? 'y' : 'ies'}
          </button>
        </div>
      )}

      {/* Edit modal overlay */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#FAFAFA] font-semibold text-base">Edit Delivery Details</h3>
              <button
                type="button"
                onClick={() => onSetEditing(null)}
                className="text-gray-500 hover:text-[#FAFAFA] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ['recipient_name', 'Full Name', 'text', true],
                  ['recipient_email', 'Email', 'email', false],
                  ['dropoff_address', 'Address', 'text', true],
                  ['dropoff_area', 'Area / City', 'text', true],
                  ['recipient_phone', 'Phone Number', 'tel', true],
                  ['package_weight', 'Product Weight (kg)', 'number', true],
                ] as [keyof CsvPreviewRow, string, string, boolean][]
              ).map(([field, label, type, required]) => (
                <Field key={field} label={`${label}${required ? '' : ''}`} htmlFor={`modal_${editingRow._id}_${field}`} optional={!required}>
                  <input
                    id={`modal_${editingRow._id}_${field}`}
                    type={type}
                    value={editingRow[field] as string}
                    onChange={(e) => onUpdateRow(editingRow._id, field, e.target.value)}
                    className={inputClass}
                  />
                </Field>
              ))}
              <div className="sm:col-span-2">
                <Field label="Item Description & Instruction" htmlFor={`modal_${editingRow._id}_desc`}>
                  <textarea
                    id={`modal_${editingRow._id}_desc`}
                    rows={3}
                    value={editingRow.package_description}
                    onChange={(e) => onUpdateRow(editingRow._id, 'package_description', e.target.value)}
                    className={inputClass + ' resize-none'}
                    placeholder="Describe the item, value, insurance need, and delivery instructions"
                  />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onSetEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-gray-400 text-sm hover:text-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onSaveRow(editingRow._id); onSetEditing(null); }}
                className="flex-1 py-2.5 rounded-xl bg-[#F2FF66] text-[#0A0A0A] font-semibold text-sm hover:bg-[#e8f550] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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
            <textarea
              id="package_description"
              rows={3}
              value={delivery.package_description}
              onChange={(e) => onChange('package_description', e.target.value)}
              className={inputClass + ' resize-none'}
              placeholder="₦25,000 – Sneakers – Yes Insurance – Apt 2B"
            />
            <p className="text-gray-600 text-xs mt-1">
              Format: Item value, description, insurance request (interstate/international only), delivery instructions
              <br />
              Example: ₦25,000 – Sneakers – Yes Insurance – Apt 2B or ₦15,000 – Laptop Bag – No Insurance – Leave with reception
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

function CreateOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get('draft');

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

  // Draft order state
  const [draftOrderId, setDraftOrderId] = useState<number | null>(null);
  const [draftOrderNumber, setDraftOrderNumber] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Error / status
  const [error, setError] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [showMobileEstimate, setShowMobileEstimate] = useState(false);

  // Multi-input mode toggle
  const [multiInputMode, setMultiInputMode] = useState<'manual' | 'bulk'>('manual');

  // Per-item editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // CSV bulk preview state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null);
  const [bulkEditingId, setBulkEditingId] = useState<string | null>(null);

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

  /* ---- Load draft order if ?draft=ORD-XXXXXX ---- */
  useEffect(() => {
    if (!draftParam) return;
    setLoadingDraft(true);
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(draftParam)}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setError('Could not load draft order.');
          return;
        }
        const data = await res.json();
        const order = data.order;
        if (!order) return;

        setDraftOrderId(order.id);
        setDraftOrderNumber(order.order_number);

        // Pre-fill pickup
        setPickup({
          sender_name: order.sender_name ?? '',
          sender_phone: order.sender_phone ?? '',
          pickup_area: order.pickup_area ?? '',
          pickup_address: order.pickup_address ?? '',
          pickup_date: order.pickup_date ?? todayString(),
          payment_method: (order.payment_method as PaymentMethod) ?? 'sender_pays',
          is_express: order.is_express ?? false,
        });

        // Pre-fill deliveries
        const draftDeliveries: DeliveryItem[] = (order.deliveries ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d: any) => ({
            _id: generateId(),
            recipient_name: d.recipient_name ?? '',
            recipient_phone: d.recipient_phone ?? '',
            recipient_email: d.recipient_email ?? '',
            dropoff_area: d.dropoff_area ?? '',
            dropoff_address: d.dropoff_address ?? '',
            package_description: d.package_description ?? '',
            package_weight: d.package_weight?.toString() ?? '',
          })
        );
        if (draftDeliveries.length > 0) {
          setDeliveries(draftDeliveries);
          if (draftDeliveries.length > 1) setActiveTab('multi');
        }
      } catch {
        setError('Failed to load draft order.');
      } finally {
        setLoadingDraft(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftParam]);

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
    const newItem = emptyDelivery();
    setDeliveries((ds) => [...ds, newItem]);
    setEditingId(newItem._id);
    setHasEstimated(false);
  }, []);

  /* ---- Remove delivery ---- */
  const removeDelivery = useCallback((idx: number) => {
    setDeliveries((ds) => ds.filter((_, i) => i !== idx));
    setHasEstimated(false);
  }, []);

  /* ---- Tab switch (never resets deliveries) ---- */
  const handleTabSwitch = useCallback((tab: 'single' | 'multi') => {
    setActiveTab(tab);
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
      // On mobile, open the full-screen estimate sheet automatically
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setShowMobileEstimate(true);
      }
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

        let res: Response;

        if (draftOrderId) {
          // PATCH existing draft order
          res = await fetch(`/api/orders/${draftOrderId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({
              is_draft: isDraft,
              status: isDraft ? 'draft' : 'pending',
              pickup: { ...pickup },
              deliveries: deliveryPayload,
              total_fee: estimates.total,
            }),
          });
        } else {
          // POST new order
          res = await fetch('/api/orders', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              pickup: { ...pickup },
              deliveries: deliveryPayload,
              is_draft: isDraft,
              total_fee: estimates.total,
            }),
          });
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Failed to place order.');
          return;
        }

        const data = await res.json();
        const orderNumber: string =
          data.order?.order_number ?? data.order_number ?? data.id ?? '';
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
    [estimates, pickup, deliveries, activeTab, router, draftOrderId]
  );

  /* ---- CSV / bulk parse ---- */
  const handleBulkFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setError('File must have a header row and at least one data row.');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows: CsvPreviewRow[] = lines.slice(1).map((line) => {
        // Handle quoted commas properly
        const cols: string[] = [];
        let inQuote = false;
        let current = '';
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === ',' && !inQuote) { cols.push(current.trim()); current = ''; }
          else { current += ch; }
        }
        cols.push(current.trim());

        const get = (name: string) => cols[headers.indexOf(name)]?.replace(/^"|"$/g, '').trim() ?? '';

        const recipient_name = get('recipient_name') || get('name') || get('full_name');
        const recipient_phone = get('recipient_phone') || get('phone') || get('phone_number');
        const recipient_email = get('recipient_email') || get('email');
        const dropoff_area = get('dropoff_area') || get('area') || get('city');
        const dropoff_address = get('dropoff_address') || get('address');
        const package_description = get('package_description') || get('description') || get('item_description');
        const package_weight = get('package_weight') || get('weight') || get('product_weight');

        // Validate row
        const errors: string[] = [];
        if (!recipient_name) errors.push('Missing name');
        if (!recipient_phone) errors.push('Missing phone');
        if (!dropoff_area && !dropoff_address) errors.push('Missing address');
        if (!package_weight || isNaN(parseFloat(package_weight))) errors.push('Missing/invalid weight');

        return {
          _id: generateId(),
          recipient_name,
          recipient_phone,
          recipient_email,
          dropoff_area,
          dropoff_address,
          package_description,
          package_weight,
          _error: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleBulkUpdateRow = useCallback(
    (id: string, field: keyof CsvPreviewRow, value: string) => {
      setCsvPreview((rows) =>
        rows ? rows.map((r) => (r._id === id ? { ...r, [field]: value } : r)) : rows
      );
    },
    []
  );

  const handleBulkDeleteRow = useCallback((id: string) => {
    setCsvPreview((rows) => (rows ? rows.filter((r) => r._id !== id) : rows));
  }, []);

  const handleBulkConfirm = useCallback(() => {
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
    setMultiInputMode('manual');
    setActiveTab('multi');
    setHasEstimated(false);
  }, [csvPreview]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/deliveries/bulk-template', {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-delivery-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    }
  }, []);

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
        {/* Draft order banner */}
        {draftOrderNumber && (
          <div className="mb-6 rounded-xl border border-amber-600/40 bg-amber-900/20 px-4 py-3 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-amber-300 text-sm">
              Editing draft order <span className="font-bold">{draftOrderNumber}</span>
            </p>
          </div>
        )}

        {/* Loading draft spinner */}
        {loadingDraft && (
          <div className="mb-6 rounded-xl border border-[#2A2A2A] bg-[#191314] px-4 py-3 text-gray-400 text-sm">
            Loading draft order…
          </div>
        )}

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
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 flex flex-col gap-6">
          {/* ======= LEFT COLUMN: Form ======= */}
          <div className="flex flex-col gap-6">
            {/* Pickup section */}
            <PickupSection pickup={pickup} onChange={handlePickupChange} />

            {/* Multi-delivery input mode toggle */}
            {isMulti && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMultiInputMode('manual')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    multiInputMode === 'manual'
                      ? 'bg-[#F2FF66] text-[#0A0A0A]'
                      : 'border border-[#2A2A2A] text-[#888888] hover:border-gray-500'
                  }`}
                >
                  Enter Manually
                </button>
                <button
                  type="button"
                  onClick={() => setMultiInputMode('bulk')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    multiInputMode === 'bulk'
                      ? 'bg-[#F2FF66] text-[#0A0A0A]'
                      : 'border border-[#2A2A2A] text-[#888888] hover:border-gray-500'
                  }`}
                >
                  Bulk Upload
                </button>
              </div>
            )}

            {/* Single delivery form */}
            {!isMulti && (
              <SingleDeliveryForm
                delivery={deliveries[0]}
                onChange={(field, value) => handleDeliveryChange(0, field, value)}
              />
            )}

            {/* Multi mode: manual list */}
            {isMulti && multiInputMode === 'manual' && (
              <div className="flex flex-col gap-3">
                {deliveries.map((d, idx) => (
                  <CompactDeliveryCard
                    key={d._id}
                    delivery={d}
                    index={idx}
                    total={deliveries.length}
                    isEditing={editingId === d._id}
                    isLast={idx === deliveries.length - 1}
                    onEdit={() => setEditingId(editingId === d._id ? null : d._id)}
                    onRemove={() => removeDelivery(idx)}
                    onChange={(field, value) => handleDeliveryChange(idx, field, value)}
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

            {/* Multi mode: bulk upload */}
            {isMulti && multiInputMode === 'bulk' && (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#191314] p-5 flex flex-col gap-4">
                <SectionHeading>Bulk Upload</SectionHeading>

                {csvPreview ? (
                  <BulkPreviewCards
                    rows={csvPreview}
                    editingId={bulkEditingId}
                    onSetEditing={setBulkEditingId}
                    onUpdateRow={handleBulkUpdateRow}
                    onSaveRow={(id) => setCsvPreview((rows) => rows ? rows.map((r) => r._id === id ? revalidateRow(r) : r) : rows)}
                    onDeleteRow={handleBulkDeleteRow}
                    onRemoveAll={(tab) => {
                      setCsvPreview((prev) => {
                        if (!prev) return null;
                        const remaining =
                          tab === 'valid'
                            ? prev.filter((r) => !!r._error)   // keep only invalid
                            : prev.filter((r) => !r._error);   // keep only valid
                        return remaining.length === 0 ? null : remaining;
                      });
                    }}
                    onConfirm={handleBulkConfirm}
                    onCancel={() => setCsvPreview(null)}
                  />
                ) : (
                  <BulkUploadZone
                    onFile={handleBulkFile}
                    onDownloadTemplate={handleDownloadTemplate}
                  />
                )}
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

          </div>

          {/* ======= RIGHT COLUMN: Fixed estimate panel (desktop only) ======= */}
          <div className="hidden lg:block">
            <div className="sticky top-20" style={{ height: '80vh' }}>
              <div className="h-full overflow-y-auto">
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
                    draftOrderNumber={draftOrderNumber}
                  />
                ) : (
                  <EstimatePlaceholder />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======= MOBILE: Full-screen estimate sheet ======= */}
      {showMobileEstimate && hasEstimated && estimates && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col">
          {/* Sheet header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1A1A1A] flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowMobileEstimate(false)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-[#FAFAFA] text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
          </div>
          {/* Estimate content — fills remaining space, EstimateSummary handles internal scroll + pinned buttons */}
          <div className="flex-1 overflow-hidden p-4">
            <EstimateSummary
              pickup={pickup}
              deliveries={activeDeliveries}
              estimates={estimates}
              isMulti={isMulti}
              onPlaceOrder={() => { setShowMobileEstimate(false); submitOrder(false); }}
              onSaveDraft={() => { setShowMobileEstimate(false); submitOrder(true); }}
              placing={placing}
              savingDraft={savingDraft}
              draftOrderNumber={draftOrderNumber}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#F2FF66] border-t-transparent rounded-full animate-spin" /></div>}>
      <CreateOrderPageContent />
    </Suspense>
  );
}
