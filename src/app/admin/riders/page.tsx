'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Rider } from '@/lib/types';

interface RiderStats {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  currently_assigned: number;
}

interface RiderWithStats extends Rider {
  stats?: RiderStats;
}

const EMPTY_FORM = { name: '', phone: '', pin: '' };

export default function AdminRidersPage() {
  const router = useRouter();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/admin');
    return token;
  }, [router]);

  const fetchRiders = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/riders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRiders(Array.isArray(data) ? data : (data.riders ?? []));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  async function handleAddRider(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error || 'Failed to add rider.');
        return;
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      await fetchRiders();
    } catch {
      setFormError('Network error.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggleActive(rider: RiderWithStats) {
    const token = getToken();
    if (!token) return;
    setActionLoading(`toggle-${rider.id}`);
    try {
      await fetch(`/api/riders/${rider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !rider.is_active }),
      });
      await fetchRiders();
    } finally {
      setActionLoading(null);
    }
  }

  const inputCls = `
    w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg
    px-3 py-2.5 text-[#FAFAFA] text-sm placeholder:text-[#888888]
    focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66]/20
    transition-colors
  `;
  const labelCls = 'text-[#888888] text-xs font-medium uppercase tracking-wider mb-1 block';

  const activeCount = riders.filter((r) => r.is_active).length;
  const inactiveCount = riders.filter((r) => !r.is_active).length;

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Riders</h1>
          <p className="text-[#888888] text-xs mt-0.5">
            {riders.length} total · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(EMPTY_FORM); }}
          className="bg-[#F2FF66] text-[#0A0A0A] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e8f55c] active:scale-95 transition-all"
        >
          + Add Rider
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-3xl font-bold text-[#FAFAFA]">{activeCount}</p>
          <p className="text-[#888888] text-xs mt-1">Active Riders</p>
        </div>
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-3xl font-bold text-[#FAFAFA]">{inactiveCount}</p>
          <p className="text-[#888888] text-xs mt-1">Inactive Riders</p>
        </div>
      </div>

      {/* Riders List */}
      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-4 space-y-2 animate-pulse">
              <div className="w-32 h-4 bg-[#2A2A2A] rounded" />
              <div className="w-24 h-3 bg-[#2A2A2A] rounded" />
              <div className="w-20 h-5 bg-[#2A2A2A] rounded-full" />
            </div>
          ))}
        </div>
      ) : riders.length === 0 ? (
        <div className="py-16 text-center text-[#888888] text-sm">No riders yet. Add one above.</div>
      ) : (
        <div className="space-y-3">
          {riders.map((rider) => {
            const isExpanded = expandedId === rider.id;
            return (
              <div key={rider.id} className="bg-[#191314] border border-[#2A2A2A] rounded-xl overflow-hidden">
                {/* Card Header */}
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : rider.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg flex-shrink-0">
                      🏍️
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#FAFAFA] font-semibold text-sm truncate">{rider.name}</p>
                      <p className="text-[#888888] text-xs">{rider.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        rider.is_active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {rider.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[#888888] text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#2A2A2A] pt-3 space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Today', value: rider.stats?.today ?? '—' },
                        { label: 'This Week', value: rider.stats?.this_week ?? '—' },
                        { label: 'This Month', value: rider.stats?.this_month ?? '—' },
                        { label: 'All Time', value: rider.stats?.total ?? '—' },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#0A0A0A] rounded-lg p-3 text-center">
                          <p className="text-[#FAFAFA] font-bold text-lg">{s.value}</p>
                          <p className="text-[#888888] text-[10px]">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {rider.stats?.currently_assigned !== undefined && (
                      <p className="text-[#888888] text-xs">
                        Currently assigned:{' '}
                        <span className="text-[#F2FF66] font-medium">{rider.stats.currently_assigned} order{rider.stats.currently_assigned !== 1 ? 's' : ''}</span>
                      </p>
                    )}

                    {/* Info */}
                    <div className="text-xs text-[#888888]">
                      <p>Joined: {new Date(rider.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(rider)}
                        disabled={actionLoading === `toggle-${rider.id}`}
                        className={`
                          flex-1 text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50
                          ${rider.is_active
                            ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border border-green-500/30 text-green-400 hover:bg-green-500/10'
                          }
                        `}
                      >
                        {actionLoading === `toggle-${rider.id}`
                          ? '...'
                          : rider.is_active
                          ? '⏸️ Deactivate'
                          : '▶️ Activate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Rider Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-[#191314] border border-[#2A2A2A] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-[#FAFAFA] font-bold">Add New Rider</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888888] hover:text-[#FAFAFA] text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddRider} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{formError}</div>
              )}
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Emeka Okafor"
                />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  placeholder="08012345678"
                  type="tel"
                />
              </div>
              <div>
                <label className={labelCls}>PIN (4–6 digits)</label>
                <input
                  className={inputCls}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required
                  placeholder="••••"
                  type="password"
                  minLength={4}
                  maxLength={6}
                  pattern="[0-9]{4,6}"
                />
                <p className="text-[#888888] text-xs mt-1">Rider uses this PIN to log in</p>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#F2FF66] text-[#0A0A0A] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? 'Adding...' : 'Add Rider'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
