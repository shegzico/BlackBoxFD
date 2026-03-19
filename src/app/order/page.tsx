'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AddressInput from '@/components/AddressInput';
import { LAGOS_ZONES, PAYMENT_LABELS, PaymentMethod, PricingEntry, isValidNigerianPhone } from '@/lib/types';

interface FormData {
  sender_name: string;
  sender_phone: string;
  sender_email: string;
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
  sender_email: '',
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
        {label}{optional && <span className="text-gray-600 ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function PhoneInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
  error,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
}) {
  const inputClass =
    'w-full rounded-lg bg-[#232023] border text-[#FAFAFA] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors';

  return (
    <div>
      <input
        id={id}
        name={name}
        type="tel"
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputClass} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-[#F2FF66] focus:ring-[#F2FF66]'}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function OrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneErrors, setPhoneErrors] = useState<{ sender?: string; recipient?: string }>({});
  const [pricing, setPricing] = useState<PricingEntry[]>([]);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Fetch pricing on mount
  useEffect(() => {
    fetch('/api/pricing?active=true')
      .then((r) => r.json())
      .then((data) => {
        setPricing(data.pricing || []);
        setPricingLoaded(true);
      })
      .catch(() => setPricingLoaded(true));
  }, []);

  // Build price lookup
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    pricing.forEach((p) => { map[p.location] = p.price; });
    return map;
  }, [pricing]);

  // Calculate delivery fee
  const deliveryFee = useMemo(() => {
    if (!form.pickup_area || !form.dropoff_area) return null;
    const pickupPrice = priceMap[form.pickup_area];
    const dropoffPrice = priceMap[form.dropoff_area];
    if (pickupPrice === undefined && dropoffPrice === undefined) return null;
    // Use the higher of the two prices (longest distance determines fee)
    const baseFee = Math.max(pickupPrice ?? 0, dropoffPrice ?? 0);
    return form.is_express ? Math.round(baseFee * 1.5) : baseFee;
  }, [form.pickup_area, form.dropoff_area, form.is_express, priceMap]);

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

    // Clear phone errors on change
    if (name === 'sender_phone') setPhoneErrors((p) => ({ ...p, sender: undefined }));
    if (name === 'recipient_phone') setPhoneErrors((p) => ({ ...p, recipient: undefined }));
  }

  function validatePhones(): boolean {
    const errors: { sender?: string; recipient?: string } = {};
    if (form.sender_phone && !isValidNigerianPhone(form.sender_phone)) {
      errors.sender = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    if (form.recipient_phone && !isValidNigerianPhone(form.recipient_phone)) {
      errors.recipient = 'Enter a valid Nigerian phone (e.g. 08012345678)';
    }
    setPhoneErrors(errors);
    return !errors.sender && !errors.recipient;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.payment_method) {
      setError('Please select a payment method.');
      return;
    }

    if (!validatePhones()) {
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
          sender_email: form.sender_email || undefined,
          pickup_area: form.pickup_area,
          pickup_address: form.pickup_address,
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          dropoff_area: form.dropoff_area,
          dropoff_address: form.dropoff_address,
          package_description: form.package_description || undefined,
          payment_method: form.payment_method,
          is_express: form.is_express,
          fee: deliveryFee,
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
              <PhoneInput
                id="sender_phone"
                name="sender_phone"
                value={form.sender_phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
                required
                error={phoneErrors.sender}
              />
            </Field>
            <Field label="Email" htmlFor="sender_email" optional>
              <input
                id="sender_email"
                name="sender_email"
                type="email"
                value={form.sender_email}
                onChange={handleChange}
                placeholder="e.g. chidi@email.com"
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
              <AddressInput
                id="pickup_address"
                name="pickup_address"
                required
                value={form.pickup_address}
                onChange={(val) => setForm(prev => ({ ...prev, pickup_address: val }))}
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
              <PhoneInput
                id="recipient_phone"
                name="recipient_phone"
                value={form.recipient_phone}
                onChange={handleChange}
                placeholder="e.g. 08098765432"
                required
                error={phoneErrors.recipient}
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
              <AddressInput
                id="dropoff_address"
                name="dropoff_address"
                required
                value={form.dropoff_address}
                onChange={(val) => setForm(prev => ({ ...prev, dropoff_address: val }))}
                placeholder="Street address, landmark..."
                className={inputClass}
              />
            </Field>
          </section>

          {/* Package & Payment */}
          <section className="bg-[#191314] rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
            <SectionHeading>Package &amp; Payment</SectionHeading>
            <Field label="Package Description" htmlFor="package_description" optional>
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

          {/* Delivery Cost Display */}
          {pricingLoaded && deliveryFee !== null && (
            <section className="bg-[#191314] rounded-xl p-5 border border-[#F2FF66]/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Delivery Fee</span>
                <span className="text-[#F2FF66] text-2xl font-bold">
                  ₦{deliveryFee.toLocaleString('en-NG')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{form.pickup_area} → {form.dropoff_area}</span>
                {form.is_express && <span className="text-amber-400">Express +50%</span>}
              </div>
            </section>
          )}

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
