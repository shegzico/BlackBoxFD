'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { LAGOS_ZONES, PAYMENT_LABELS, PaymentMethod } from '@/lib/types';

interface FormData {
  sender_name: string;
  sender_phone: string;
  pickup_area: string;
  pickup_address: string;
  recipient_name: string;
  recipient_phone: string;
  dropoff_area: string;
  dropoff_address: string;
  package_description: string;
  payment_method: PaymentMethod | '';
  is_express: boolean;
}

const initialForm: FormData = {
  sender_name: '',
  sender_phone: '',
  pickup_area: '',
  pickup_address: '',
  recipient_name: '',
  recipient_phone: '',
  dropoff_area: '',
  dropoff_address: '',
  package_description: '',
  payment_method: '',
  is_express: false,
};

function ZoneSelect({
  id,
  name,
  value,
  onChange,
  required,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors appearance-none"
    >
      <option value="" disabled>
        Select an area
      </option>
      {(Object.entries(LAGOS_ZONES) as [string, readonly string[]][]).map(
        ([category, zones]) => (
          <optgroup key={category} label={category}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </optgroup>
        )
      )}
    </select>
  );
}

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
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-gray-400 text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function OrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.payment_method) {
      setError('Please select a payment method.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: form.sender_name,
          sender_phone: form.sender_phone,
          pickup_area: form.pickup_area,
          pickup_address: form.pickup_address,
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          dropoff_area: form.dropoff_area,
          dropoff_address: form.dropoff_address,
          package_description: form.package_description || undefined,
          payment_method: form.payment_method,
          is_express: form.is_express,
          created_by: 'customer',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      const trackingId: string = data.delivery.id;
      router.push(`/order/confirmation?id=${trackingId}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <Navbar showBack backHref="/" title="Place Order" />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">

          {/* Sender Details */}
          <section className="bg-[#191314] rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
            <SectionHeading>Sender Details</SectionHeading>
            <Field label="Full Name *" htmlFor="sender_name">
              <input
                id="sender_name"
                name="sender_name"
                type="text"
                required
                value={form.sender_name}
                onChange={handleChange}
                placeholder="e.g. Chidi Okonkwo"
                className={inputClass}
              />
            </Field>
            <Field label="Phone Number *" htmlFor="sender_phone">
              <input
                id="sender_phone"
                name="sender_phone"
                type="tel"
                required
                value={form.sender_phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
                className={inputClass}
              />
            </Field>
            <Field label="Pickup Area *" htmlFor="pickup_area">
              <ZoneSelect
                id="pickup_area"
                name="pickup_area"
                value={form.pickup_area}
                onChange={handleChange}
                required
              />
            </Field>
            <Field label="Pickup Address *" htmlFor="pickup_address">
              <input
                id="pickup_address"
                name="pickup_address"
                type="text"
                required
                value={form.pickup_address}
                onChange={handleChange}
                placeholder="Street address, landmark..."
                className={inputClass}
              />
            </Field>
          </section>

          {/* Recipient Details */}
          <section className="bg-[#191314] rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
            <SectionHeading>Recipient Details</SectionHeading>
            <Field label="Full Name *" htmlFor="recipient_name">
              <input
                id="recipient_name"
                name="recipient_name"
                type="text"
                required
                value={form.recipient_name}
                onChange={handleChange}
                placeholder="e.g. Amaka Eze"
                className={inputClass}
              />
            </Field>
            <Field label="Phone Number *" htmlFor="recipient_phone">
              <input
                id="recipient_phone"
                name="recipient_phone"
                type="tel"
                required
                value={form.recipient_phone}
                onChange={handleChange}
                placeholder="e.g. 08098765432"
                className={inputClass}
              />
            </Field>
            <Field label="Dropoff Area *" htmlFor="dropoff_area">
              <ZoneSelect
                id="dropoff_area"
                name="dropoff_area"
                value={form.dropoff_area}
                onChange={handleChange}
                required
              />
            </Field>
            <Field label="Dropoff Address *" htmlFor="dropoff_address">
              <input
                id="dropoff_address"
                name="dropoff_address"
                type="text"
                required
                value={form.dropoff_address}
                onChange={handleChange}
                placeholder="Street address, landmark..."
                className={inputClass}
              />
            </Field>
          </section>

          {/* Package & Payment */}
          <section className="bg-[#191314] rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
            <SectionHeading>Package &amp; Payment</SectionHeading>
            <Field label="Package Description (optional)" htmlFor="package_description">
              <textarea
                id="package_description"
                name="package_description"
                value={form.package_description}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Documents, phone, clothing..."
                className={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="Payment Method *" htmlFor="payment_method">
              <select
                id="payment_method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                required
                className="w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors appearance-none"
              >
                <option value="" disabled>
                  Select payment method
                </option>
                {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </Field>

            {/* Express Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="is_express"
                id="is_express"
                checked={form.is_express}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-[#232023] accent-[#F2FF66] cursor-pointer flex-shrink-0"
              />
              <div>
                <span className="text-sm text-[#FAFAFA] font-medium">Express Delivery</span>
                <p className="text-xs text-gray-500 mt-0.5">+50% surcharge for priority dispatch</p>
              </div>
            </label>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full py-4 rounded-xl font-bold text-base
              bg-[#F2FF66] text-[#0A0A0A]
              hover:bg-[#e8f550] active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            {loading ? 'Placing Order…' : 'Place Order'}
          </button>
        </form>
      </main>
    </div>
  );
}
