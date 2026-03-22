'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  name: string;
  phone: string;
  email?: string;
  order_count: number;
  last_order: string;
}

interface Recipient {
  name: string;
  phone: string;
  delivery_count: number;
  last_delivery: string;
}

type Tab = 'customers' | 'recipients';

const inputCls = `w-full bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder:text-[#a1a4a5] focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[rgba(33,38,41,0.4)] transition-colors`;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [search, setSearch] = useState('');

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
    return token;
  }, [router]);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setRecipients(data.recipients ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const filteredRecipients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
    );
  }, [recipients, search]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Customers &amp; Recipients</h1>
          <p className="text-[#a1a4a5] text-sm mt-1">
            View senders and delivery recipients
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#a1a4a5] text-xs uppercase tracking-wider">
              Total Customers
            </p>
            <p className="text-2xl font-bold mt-1">
              {loading ? '--' : customers.length}
            </p>
          </div>
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#a1a4a5] text-xs uppercase tracking-wider">
              Total Recipients
            </p>
            <p className="text-2xl font-bold mt-1">
              {loading ? '--' : recipients.length}
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)]">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              activeTab === 'customers'
                ? 'text-[#f0f0f0] border-b-2 border-[#f0f0f0]'
                : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              activeTab === 'recipients'
                ? 'text-[#f0f0f0] border-b-2 border-[#f0f0f0]'
                : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
            }`}
          >
            Recipients
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls}
        />

        {/* Content */}
        {loading ? (
          <div className="text-center text-[#a1a4a5] py-16 text-sm">
            Loading...
          </div>
        ) : activeTab === 'customers' ? (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center text-[#a1a4a5] py-12 text-sm">
                {search ? 'No customers match your search.' : 'No customers yet.'}
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.phone}
                  className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[#a1a4a5] text-xs mt-0.5">{c.phone}</p>
                      {c.email && (
                        <p className="text-[#a1a4a5] text-xs truncate">
                          {c.email}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-[rgba(255,255,255,0.07)] text-[#f0f0f0] text-xs font-semibold px-2 py-1 rounded-md">
                        {c.order_count} order{c.order_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#a1a4a5] text-xs">
                    Last order: {formatDate(c.last_order)}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecipients.length === 0 ? (
              <div className="text-center text-[#a1a4a5] py-12 text-sm">
                {search
                  ? 'No recipients match your search.'
                  : 'No recipients yet.'}
              </div>
            ) : (
              filteredRecipients.map((r) => (
                <div
                  key={r.phone}
                  className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.name}</p>
                      <p className="text-[#a1a4a5] text-xs mt-0.5">{r.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-[rgba(255,255,255,0.07)] text-[#f0f0f0] text-xs font-semibold px-2 py-1 rounded-md">
                        {r.delivery_count} deliver{r.delivery_count !== 1 ? 'ies' : 'y'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#a1a4a5] text-xs">
                    Last delivery: {formatDate(r.last_delivery)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
