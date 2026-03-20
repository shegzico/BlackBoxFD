'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

type ModalMode = 'add' | 'edit';

const EMPTY_FORM = {
  name: '',
  username: '',
  phone: '',
  pin: '',
  bike_plate: '',
  bike_model: '',
  bike_color: '',
  image_url: '',
};

export default function AdminRidersPage() {
  const router = useRouter();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingRider, setEditingRider] = useState<RiderWithStats | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
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

  function openAddModal() {
    setModalMode('add');
    setEditingRider(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setFormError('');
  }

  function openEditModal(rider: RiderWithStats) {
    setModalMode('edit');
    setEditingRider(rider);
    setForm({
      name: rider.name,
      username: rider.username ?? '',
      phone: rider.phone,
      pin: '', // Don't pre-fill PIN
      bike_plate: rider.bike_plate ?? '',
      bike_model: rider.bike_model ?? '',
      bike_color: rider.bike_color ?? '',
      image_url: rider.image_url ?? '',
    });
    setImagePreview(rider.image_url ?? null);
    setFormError('');
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image_url: base64 }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'add') {
        if (!form.pin) {
          setFormError('PIN is required for new riders.');
          setFormLoading(false);
          return;
        }
        const res = await fetch('/api/riders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: form.name,
            username: form.username.toLowerCase().trim(),
            phone: form.phone,
            pin: form.pin,
            bike_plate: form.bike_plate || null,
            bike_model: form.bike_model || null,
            bike_color: form.bike_color || null,
            image_url: form.image_url || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setFormError(d.error || 'Failed to add rider.');
          return;
        }
      } else if (modalMode === 'edit' && editingRider) {
        const updateBody: Record<string, unknown> = {
          name: form.name,
          username: form.username.toLowerCase().trim(),
          phone: form.phone,
          bike_plate: form.bike_plate || null,
          bike_model: form.bike_model || null,
          bike_color: form.bike_color || null,
          image_url: form.image_url || null,
        };
        // Only include PIN if user entered a new one
        if (form.pin) {
          updateBody.pin = form.pin;
        }
        const res = await fetch(`/api/riders/${editingRider.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updateBody),
        });
        if (!res.ok) {
          const d = await res.json();
          setFormError(d.error || 'Failed to update rider.');
          return;
        }
      }
      setModalMode(null);
      setEditingRider(null);
      setForm(EMPTY_FORM);
      setImagePreview(null);
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

  function RiderAvatar({ rider, size = 'md' }: { rider: RiderWithStats; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';
    if (rider.image_url) {
      return (
        <img
          src={rider.image_url}
          alt={rider.name}
          className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg flex-shrink-0`}>
        <svg className="w-5 h-5 text-[#888888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    );
  }

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
          onClick={openAddModal}
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
                    <RiderAvatar rider={rider} />
                    <div className="min-w-0">
                      <p className="text-[#FAFAFA] font-semibold text-sm truncate">{rider.name}</p>
                      <p className="text-[#888888] text-xs">
                        {rider.username && <span className="text-[#F2FF66]/70 font-mono">@{rider.username} · </span>}
                        {rider.phone}
                      </p>
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
                    {/* Bike Info */}
                    {(rider.bike_plate || rider.bike_model || rider.bike_color) && (
                      <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
                        <p className="text-[#888888] text-[10px] uppercase tracking-wider mb-2 font-medium">Bike Info</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {rider.bike_model && (
                            <div>
                              <p className="text-[#888888]">Model</p>
                              <p className="text-[#FAFAFA]">{rider.bike_model}</p>
                            </div>
                          )}
                          {rider.bike_plate && (
                            <div>
                              <p className="text-[#888888]">Plate</p>
                              <p className="text-[#F2FF66] font-mono">{rider.bike_plate}</p>
                            </div>
                          )}
                          {rider.bike_color && (
                            <div>
                              <p className="text-[#888888]">Color</p>
                              <p className="text-[#FAFAFA]">{rider.bike_color}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                        onClick={() => openEditModal(rider)}
                        className="flex-1 border border-[#F2FF66]/30 text-[#F2FF66] hover:bg-[#F2FF66]/10 text-sm py-2 rounded-lg font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
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

      {/* Add/Edit Rider Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-[#191314] border border-[#2A2A2A] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#191314] z-10">
              <h2 className="text-[#FAFAFA] font-bold">
                {modalMode === 'add' ? 'Add New Rider' : `Edit Rider — ${editingRider?.name}`}
              </h2>
              <button
                onClick={() => { setModalMode(null); setEditingRider(null); }}
                className="text-[#888888] hover:text-[#FAFAFA] text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{formError}</div>
              )}

              {/* Profile Image */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-full bg-[#2A2A2A] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#444] hover:border-[#F2FF66] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 text-[#888888] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      <p className="text-[#888888] text-[10px] mt-1">Photo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-[#888888] text-[10px]">Tap to upload photo (max 2MB)</p>
              </div>

              {/* Basic Info */}
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
                <label className={labelCls}>Username <span className="text-[#555] normal-case font-normal">(used to log in)</span></label>
                <input
                  className={inputCls}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  required
                  placeholder="emeka.okafor"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-[#666] text-xs mt-1">Lowercase only, no spaces. Must be unique.</p>
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
                <label className={labelCls}>
                  {modalMode === 'edit' ? 'New PIN (leave blank to keep current)' : 'PIN (4–6 digits)'}
                </label>
                <input
                  className={inputCls}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required={modalMode === 'add'}
                  placeholder="••••"
                  type="password"
                  minLength={4}
                  maxLength={6}
                  pattern="[0-9]{4,6}"
                />
                <p className="text-[#888888] text-xs mt-1">
                  {modalMode === 'edit' ? 'Only fill to change PIN' : 'Rider uses this PIN to log in'}
                </p>
              </div>

              {/* Bike Info Section */}
              <div className="border-t border-[#2A2A2A] pt-4">
                <p className="text-[#F2FF66] text-xs font-semibold uppercase tracking-wider mb-3">Bike Information</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Bike Model</label>
                    <input
                      className={inputCls}
                      value={form.bike_model}
                      onChange={(e) => setForm({ ...form, bike_model: e.target.value })}
                      placeholder="e.g. Honda CG 125"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Plate Number</label>
                      <input
                        className={inputCls}
                        value={form.bike_plate}
                        onChange={(e) => setForm({ ...form, bike_plate: e.target.value })}
                        placeholder="e.g. LAG-123-XY"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Bike Color</label>
                      <input
                        className={inputCls}
                        value={form.bike_color}
                        onChange={(e) => setForm({ ...form, bike_color: e.target.value })}
                        placeholder="e.g. Black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#F2FF66] text-[#0A0A0A] font-bold py-3 rounded-lg text-sm hover:bg-[#e8f55c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? 'Saving...' : modalMode === 'add' ? 'Add Rider' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
