'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── types ─── */
interface PricingLocation {
  id: string;
  location: string;
  zone_category: ZoneCategory;
  price: number;
  is_active: boolean;
}

type ZoneCategory =
  | 'Island Core'
  | 'Mainland Core'
  | 'Mainland Extended'
  | 'Island Extended'
  | 'Far Areas';

const ZONE_CATEGORIES: ZoneCategory[] = [
  'Island Core',
  'Mainland Core',
  'Mainland Extended',
  'Island Extended',
  'Far Areas',
];

/* ─── shared styles ─── */
const inputCls = `w-full bg-[#000000] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder:text-[#a1a4a5] focus:outline-none focus:border-[#212629] focus:ring-1 focus:ring-[rgba(33,38,41,0.4)] transition-colors`;
const labelCls = 'text-[#a1a4a5] text-xs font-medium uppercase tracking-wider mb-1 block';

/* ─── helpers ─── */
function formatNaira(amount: number): string {
  return '\u20A6' + amount.toLocaleString('en-NG');
}

/* ─── component ─── */
export default function AdminPricingPage() {
  const router = useRouter();

  const [locations, setLocations] = useState<PricingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // inline edit
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editZone, setEditZone] = useState<ZoneCategory>('Island Core');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addZone, setAddZone] = useState<ZoneCategory>('Island Core');
  const [addPrice, setAddPrice] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
    return token;
  }, [router]);

  /* ─── fetch ─── */
  const fetchLocations = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/pricing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : data.pricing ?? []);
    } catch {
      setError('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  /* ─── create ─── */
  const handleAdd = async () => {
    if (!addName.trim() || !addPrice.trim()) return;
    const token = getToken();
    if (!token) return;
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: addName.trim(),
          zone_category: addZone,
          price: Number(addPrice),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to create location');
      }
      setShowAdd(false);
      setAddName('');
      setAddZone('Island Core');
      setAddPrice('');
      await fetchLocations();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setAddLoading(false);
    }
  };

  /* ─── update ─── */
  const handleSave = async (id: string) => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pricing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          price: Number(editPrice),
          zone_category: editZone,
          is_active: editActive,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setExpandedId(null);
      await fetchLocations();
    } catch {
      setError('Failed to update location');
    } finally {
      setSaving(false);
    }
  };

  /* ─── expand handler ─── */
  const toggleExpand = (loc: PricingLocation) => {
    if (expandedId === loc.id) {
      setExpandedId(null);
    } else {
      setExpandedId(loc.id);
      setEditPrice(String(loc.price));
      setEditZone(loc.zone_category);
      setEditActive(loc.is_active);
    }
  };

  /* ─── derived ─── */
  const grouped = ZONE_CATEGORIES.map((zone) => ({
    zone,
    items: locations.filter((l) => l.zone_category === zone),
  })).filter((g) => g.items.length > 0);

  const totalLocations = locations.length;
  const avgPrice =
    totalLocations > 0
      ? Math.round(locations.reduce((s, l) => s + l.price, 0) / totalLocations)
      : 0;

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Pricing</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#F2FF66] text-[#000000] text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-90 transition-all"
          >
            + Add Location
          </button>
        </div>

        {/* Summary stats */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#a1a4a5] text-xs uppercase tracking-wider mb-1">
                Total Locations
              </p>
              <p className="text-xl font-bold">{totalLocations}</p>
            </div>
            <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#a1a4a5] text-xs uppercase tracking-wider mb-1">
                Average Price
              </p>
              <p className="text-xl font-bold">{formatNaira(avgPrice)}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[rgba(255,255,255,0.08)] border-t-[#F2FF66] rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[rgba(135,55,55,0.12)] border border-red-500/30 text-[#a85858] text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Grouped locations */}
        {!loading &&
          grouped.map(({ zone, items }) => (
            <div key={zone} className="mb-6">
              {/* Zone header */}
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-[#f0f0f0]">{zone}</h2>
                <span className="text-xs text-[#a1a4a5] bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>

              {/* Location cards */}
              <div className="space-y-2">
                {items.map((loc) => (
                  <div
                    key={loc.id}
                    className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden transition-colors"
                  >
                    {/* Card row */}
                    <button
                      onClick={() => toggleExpand(loc)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1f1a1b] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {loc.location}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            loc.is_active
                              ? 'bg-[#1e5030]/15 text-[#3d8050]'
                              : 'bg-red-500/15 text-[#a85858]'
                          }`}
                        >
                          {loc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-[#F2FF66] shrink-0 ml-3">
                        {formatNaira(loc.price)}
                      </span>
                    </button>

                    {/* Expanded edit form */}
                    {expandedId === loc.id && (
                      <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-4 space-y-4">
                        {/* Price */}
                        <div>
                          <label className={labelCls}>Price</label>
                          <input
                            type="number"
                            className={inputCls}
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="Enter price"
                          />
                        </div>

                        {/* Zone category */}
                        <div>
                          <label className={labelCls}>Zone Category</label>
                          <select
                            className={inputCls}
                            value={editZone}
                            onChange={(e) =>
                              setEditZone(e.target.value as ZoneCategory)
                            }
                          >
                            {ZONE_CATEGORIES.map((z) => (
                              <option key={z} value={z}>
                                {z}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center justify-between">
                          <label className={labelCls} style={{ marginBottom: 0 }}>
                            Active
                          </label>
                          <button
                            onClick={() => setEditActive((v) => !v)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              editActive ? 'bg-[#F2FF66]' : 'bg-[rgba(255,255,255,0.08)]'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#000000] transition-transform ${
                                editActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Save button */}
                        <button
                          onClick={() => handleSave(loc.id)}
                          disabled={saving}
                          className="w-full bg-[#F2FF66] text-[#000000] text-sm font-semibold py-2.5 rounded-lg hover:brightness-90 transition-all disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* Empty state */}
        {!loading && locations.length === 0 && !error && (
          <div className="text-center py-20 text-[#a1a4a5]">
            <p className="text-sm">No locations found.</p>
            <p className="text-xs mt-1">Add your first delivery location above.</p>
          </div>
        )}
      </div>

      {/* ─── Add Location Modal ─── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          />

          {/* Modal */}
          <div className="relative w-full sm:max-w-md bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Location</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {addError && (
              <div className="bg-[rgba(135,55,55,0.12)] border border-red-500/30 text-[#a85858] text-sm rounded-lg px-3 py-2">
                {addError}
              </div>
            )}

            {/* Location name */}
            <div>
              <label className={labelCls}>Location Name</label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Victoria Island"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>

            {/* Zone category */}
            <div>
              <label className={labelCls}>Zone Category</label>
              <select
                className={inputCls}
                value={addZone}
                onChange={(e) => setAddZone(e.target.value as ZoneCategory)}
              >
                {ZONE_CATEGORIES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className={labelCls}>Price</label>
              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 2500"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleAdd}
              disabled={addLoading || !addName.trim() || !addPrice.trim()}
              className="w-full bg-[#F2FF66] text-[#000000] text-sm font-semibold py-2.5 rounded-lg hover:brightness-90 transition-all disabled:opacity-50"
            >
              {addLoading ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
