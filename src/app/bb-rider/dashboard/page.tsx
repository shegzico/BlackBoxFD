'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Delivery, DeliveryStatus, PAYMENT_LABELS } from '@/lib/types';

interface RiderInfo {
  id: number;
  name: string;
  phone: string;
}

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  assigned: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'delivered',
};

const STATUS_BUTTON_LABEL: Partial<Record<DeliveryStatus, string>> = {
  assigned: 'Mark as Picked Up',
  picked_up: 'Mark as In Transit',
  in_transit: 'Mark as Delivered',
};

function RiderNavbar({ riderName, onLogout }: { riderName: string; onLogout: () => void }) {
  return (
    <nav className="w-full bg-[#070707] border-b border-[rgba(255,255,255,0.08)] px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
      <div className="flex-1 flex items-center gap-3">
        <span className="text-white font-semibold text-base truncate">Dashboard</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[#a1a4a5] text-sm hidden sm:block truncate max-w-[140px]">{riderName}</span>
        <button
          onClick={onLogout}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            bg-[#161616] hover:bg-red-500/20 border border-[rgba(255,255,255,0.06)] hover:border-red-500/50
            text-[#f0f0f0] hover:text-[#a85858] text-xs font-medium
            rounded-lg transition-all duration-150
          "
          aria-label="Logout"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex-1 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${'text-[#f0f0f0]'}`}>
        {value}
      </span>
      <span className="text-[#a1a4a5] text-xs leading-snug">{label}</span>
    </div>
  );
}

function PhoneLink({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className="flex items-center gap-1.5 text-[#F2FF66] hover:text-[#e8f55c] text-sm font-medium transition-colors"
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
      </svg>
      <span className="truncate">{label}: {phone}</span>
    </a>
  );
}

function ActiveDeliveryCard({
  delivery,
  onStatusUpdate,
  updating,
}: {
  delivery: Delivery;
  onStatusUpdate: (id: string, nextStatus: DeliveryStatus) => void;
  updating: boolean;
}) {
  const nextStatus = NEXT_STATUS[delivery.status];
  const buttonLabel = STATUS_BUTTON_LABEL[delivery.status];
  const isDelivered = delivery.status === 'in_transit';

  return (
    <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider">Tracking ID</span>
          <span className="text-[#f0f0f0] font-mono font-bold text-sm">{delivery.id}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {delivery.is_express && (
            <span className="bg-[#F2FF66] text-[#000000] text-xs font-bold px-2 py-0.5 rounded-full">
              EXPRESS
            </span>
          )}
          <StatusBadge status={delivery.status} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[rgba(255,255,255,0.08)]" />

      {/* Pickup */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
          </svg>
          Pickup
        </span>
        <span className="text-[#f0f0f0] text-sm font-semibold">{delivery.pickup_area}</span>
        <span className="text-[#AAAAAA] text-sm leading-snug">{delivery.pickup_address}</span>
      </div>

      {/* Dropoff */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[#a1a4a5] text-xs font-medium uppercase tracking-wider flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Dropoff
        </span>
        <span className="text-[#f0f0f0] text-sm font-semibold">{delivery.dropoff_area}</span>
        <span className="text-[#AAAAAA] text-sm leading-snug">{delivery.dropoff_address}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-[rgba(255,255,255,0.08)]" />

      {/* Contact info */}
      <div className="flex flex-col gap-2">
        <PhoneLink phone={delivery.sender_phone} label="Sender" />
        <PhoneLink phone={delivery.recipient_phone} label="Recipient" />
      </div>

      {/* Package details row */}
      <div className="flex flex-wrap items-center gap-2">
        {delivery.package_description && (
          <span className="text-[#a1a4a5] text-xs bg-[#000000] border border-[rgba(255,255,255,0.08)] px-2 py-1 rounded-lg truncate max-w-full">
            {delivery.package_description}
          </span>
        )}
        <span className="text-[#a1a4a5] text-xs bg-[#000000] border border-[rgba(255,255,255,0.08)] px-2 py-1 rounded-lg flex-shrink-0">
          {PAYMENT_LABELS[delivery.payment_method]}
        </span>
      </div>

      {/* Status update button */}
      {nextStatus && buttonLabel && (
        <button
          onClick={() => onStatusUpdate(delivery.id, nextStatus)}
          disabled={updating}
          className={`
            w-full py-3 rounded-xl font-bold text-sm
            flex items-center justify-center gap-2
            active:scale-95 transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
            ${isDelivered
              ? 'bg-[#1e5030] hover:bg-green-400 text-white'
              : 'bg-[#F2FF66] hover:bg-[#e8f55c] text-[#000000]'
            }
          `}
        >
          {updating ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Updating...
            </>
          ) : (
            buttonLabel
          )}
        </button>
      )}
    </div>
  );
}

function CompletedDeliveryCard({ delivery }: { delivery: Delivery }) {
  return (
    <div className="bg-[#0F0F0F] border border-[#161616] rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#f0f0f0] font-mono font-semibold text-sm">{delivery.id}</span>
        <StatusBadge status={delivery.status} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[#a1a4a5] text-xs">
          {delivery.pickup_area} <span className="text-[#444444]">→</span> {delivery.dropoff_area}
        </span>
        <span className="text-[#666666] text-xs">{delivery.recipient_name} &bull; {delivery.recipient_phone}</span>
      </div>
    </div>
  );
}

export default function RiderDashboardPage() {
  const router = useRouter();
  const [rider, setRider] = useState<RiderInfo | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function logout() {
    localStorage.removeItem('rider_token');
    localStorage.removeItem('rider_info');
    router.replace('/bb-rider');
  }

  const fetchDeliveries = useCallback(async (riderId: number, silent = false) => {
    if (!silent) setLoadingData(true);
    setFetchError('');
    try {
      const [activeRes, completedRes] = await Promise.all([
        fetch(`/api/deliveries?rider_id=${riderId}&status=assigned,picked_up,in_transit&sort=priority`),
        fetch(`/api/deliveries?rider_id=${riderId}&status=delivered,confirmed`),
      ]);

      const activeData = await activeRes.json();
      const completedData = await completedRes.json();

      if (activeRes.ok) {
        setActiveDeliveries(activeData.deliveries || []);
      }
      if (completedRes.ok) {
        // Filter to today only
        const today = new Date().toDateString();
        const todayCompleted = (completedData.deliveries || []).filter((d: Delivery) => {
          return new Date(d.updated_at).toDateString() === today;
        });
        setCompletedDeliveries(todayCompleted);
      }
    } catch {
      setFetchError('Failed to load deliveries. Check your connection.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('rider_token');
    const info = localStorage.getItem('rider_info');

    if (!token || !info) {
      router.replace('/bb-rider');
      return;
    }

    let riderInfo: RiderInfo;
    try {
      riderInfo = JSON.parse(info);
    } catch {
      router.replace('/bb-rider');
      return;
    }

    setRider(riderInfo);
    fetchDeliveries(riderInfo.id);

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchDeliveries(riderInfo.id, true);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, fetchDeliveries]);

  function handleManualRefresh() {
    if (!rider || refreshing) return;
    setRefreshing(true);
    fetchDeliveries(rider.id, true);
  }

  async function handleStatusUpdate(deliveryId: string, nextStatus: DeliveryStatus) {
    setUpdatingId(deliveryId);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          triggered_by: 'rider',
        }),
      });

      if (res.ok && rider) {
        // Refresh list after successful update
        await fetchDeliveries(rider.id, true);
      }
    } catch {
      // silently fail, will refresh on next interval
    } finally {
      setUpdatingId(null);
    }
  }

  // Show nothing while checking auth (avoid flash)
  if (!rider && !loadingData) return null;

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <RiderNavbar riderName={rider?.name ?? ''} onLogout={logout} />

      <main className="flex-1 flex flex-col px-4 py-5 gap-5 max-w-2xl mx-auto w-full">

        {/* Stats row */}
        <div className="flex gap-3">
          <StatCard
            label="Active Deliveries"
            value={loadingData ? '—' : activeDeliveries.length}
            accent
          />
          <StatCard
            label="Completed Today"
            value={loadingData ? '—' : completedDeliveries.length}
          />
        </div>

        {/* Refresh button + error */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#666666] text-xs">
            {refreshing ? 'Refreshing...' : 'Auto-refreshes every 30s'}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loadingData}
            className="
              flex items-center gap-1.5 px-3 py-1.5
              bg-[#070707] border border-[rgba(255,255,255,0.08)] hover:border-[#212629]
              text-[#a1a4a5] hover:text-[#F2FF66] text-xs font-medium
              rounded-lg transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {fetchError && (
          <div className="p-3 bg-[rgba(135,55,55,0.12)] border border-red-500/30 rounded-lg text-[#a85858] text-sm">
            {fetchError}
          </div>
        )}

        {/* Active Deliveries Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[#f0f0f0] font-bold text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F2FF66] inline-block" />
            Active Deliveries
            {!loadingData && activeDeliveries.length > 0 && (
              <span className="ml-auto text-[#a1a4a5] text-xs font-normal">{activeDeliveries.length} order{activeDeliveries.length !== 1 ? 's' : ''}</span>
            )}
          </h2>

          {loadingData ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 animate-pulse">
                  <div className="h-4 bg-[rgba(255,255,255,0.08)] rounded w-32 mb-3" />
                  <div className="h-3 bg-[rgba(255,255,255,0.08)] rounded w-48 mb-2" />
                  <div className="h-3 bg-[rgba(255,255,255,0.08)] rounded w-40" />
                </div>
              ))}
            </div>
          ) : activeDeliveries.length === 0 ? (
            <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 flex flex-col items-center gap-2 text-center">
              <svg className="w-10 h-10 text-[#333333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-[#a1a4a5] text-sm">No active deliveries right now</p>
              <p className="text-[#555555] text-xs">New assignments will appear here automatically</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeDeliveries.map((delivery) => (
                <ActiveDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onStatusUpdate={handleStatusUpdate}
                  updating={updatingId === delivery.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Completed Today Section */}
        <section className="flex flex-col gap-2 pb-8">
          <button
            onClick={() => setCompletedOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 py-3 px-4 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl hover:border-[#3A3A3A] transition-colors"
            aria-expanded={completedOpen}
          >
            <span className="flex items-center gap-2 text-[#f0f0f0] font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-[#1e5030] inline-block" />
              Completed Today
              {!loadingData && (
                <span className="bg-[#1e5030]/20 text-[#3d8050] text-xs px-2 py-0.5 rounded-full font-medium">
                  {completedDeliveries.length}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 text-[#a1a4a5] transition-transform duration-200 ${completedOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {completedOpen && (
            <div className="flex flex-col gap-2 pt-1">
              {loadingData ? (
                <div className="bg-[#0F0F0F] border border-[#161616] rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-[#161616] rounded w-32 mb-2" />
                  <div className="h-3 bg-[#161616] rounded w-24" />
                </div>
              ) : completedDeliveries.length === 0 ? (
                <div className="bg-[#0F0F0F] border border-[#161616] rounded-xl p-6 text-center">
                  <p className="text-[#555555] text-sm">No completed deliveries today yet</p>
                </div>
              ) : (
                completedDeliveries.map((delivery) => (
                  <CompletedDeliveryCard key={delivery.id} delivery={delivery} />
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
