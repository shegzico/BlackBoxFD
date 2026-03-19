'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LAGOS_ZONES } from '@/lib/types';

type Tab = 'profile' | 'security' | 'location';

interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  default_pickup_area: string | null;
  default_pickup_address: string | null;
}

function getInitials(profile: Profile): string {
  const fn = profile.first_name?.trim();
  const ln = profile.last_name?.trim();
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  if (fn) return fn[0].toUpperCase();
  const parts = (profile.name || '').trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0][0].toUpperCase();
  return '?';
}

function resolveFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const fn = profile.first_name?.trim() || '';
  const ln = profile.last_name?.trim() || '';
  if (fn || ln) return { firstName: fn, lastName: ln };
  const parts = (profile.name || '').trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function CustomerAccount() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Profile tab state ---
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // --- Security tab state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // --- Location tab state ---
  const [pickupArea, setPickupArea] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('customer_token');
      if (!token) {
        router.replace('/customer');
        return;
      }
      try {
        const res = await fetch('/api/customer/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const raw = await res.json();
          const data: Profile = raw.customer || raw;
          setProfile(data);
          const { firstName: fn, lastName: ln } = resolveFirstLast(data);
          setFirstName(fn);
          setLastName(ln);
          setPhone(data.phone || '');
          setPickupArea(data.default_pickup_area || '');
          setPickupAddress(data.default_pickup_address || '');
          if (data.avatar_url) setAvatarPreview(data.avatar_url);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  // ---- Profile handlers ----
  function handleCancelEdit() {
    if (profile) {
      const { firstName: fn, lastName: ln } = resolveFirstLast(profile);
      setFirstName(fn);
      setLastName(ln);
      setPhone(profile.phone || '');
      setAvatarPreview(profile.avatar_url || null);
      setPendingAvatarBase64(null);
    }
    setEditing(false);
    setProfileError('');
    setProfileSuccess('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setPendingAvatarBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const body: Record<string, string | null> = {
        first_name: firstName,
        last_name: lastName,
        name: [firstName, lastName].filter(Boolean).join(' '),
        phone,
      };
      if (pendingAvatarBase64) {
        body.avatar_base64 = pendingAvatarBase64;
      }

      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const raw = await res.json();
        const updated: Profile = raw.customer || raw;
        setProfile(updated);
        const { firstName: fn, lastName: ln } = resolveFirstLast(updated);
        setFirstName(fn);
        setLastName(ln);
        setPhone(updated.phone || '');
        if (updated.avatar_url) setAvatarPreview(updated.avatar_url);
        setPendingAvatarBase64(null);
        setEditing(false);
        setProfileSuccess('Profile updated successfully.');

        try {
          const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
          info.name = updated.name;
          localStorage.setItem('customer_info', JSON.stringify(info));
        } catch {
          // ignore
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch {
      setProfileError('Network error. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  // ---- Security handler ----
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match.');
      return;
    }

    const token = localStorage.getItem('customer_token');
    if (!token) return;

    setSecuritySaving(true);
    try {
      const res = await fetch('/api/customer/change-password', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSecuritySuccess(data.message || 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSecurityError(data.error || 'Failed to update password.');
      }
    } catch {
      setSecurityError('Network error. Please try again.');
    } finally {
      setSecuritySaving(false);
    }
  }

  // ---- Location handler ----
  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    setLocationError('');
    setLocationSuccess('');

    const token = localStorage.getItem('customer_token');
    if (!token) return;

    setLocationSaving(true);
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({
          default_pickup_area: pickupArea || null,
          default_pickup_address: pickupAddress || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const updated: Profile = data.customer || data;
        setProfile((prev) => prev ? { ...prev, ...updated } : updated);
        setLocationSuccess('Default pickup location saved.');
      } else {
        setLocationError(data.error || 'Failed to save location.');
      }
    } catch {
      setLocationError('Network error. Please try again.');
    } finally {
      setLocationSaving(false);
    }
  }

  // ---- Logout ----
  function handleLogout() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    router.replace('/customer');
  }

  // ---- Shared UI ----
  const inputClass =
    'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F2FF66]/50 transition-colors placeholder:text-[#555]';
  const labelClass = 'block text-xs text-[#888888] mb-1.5';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'location', label: 'Location' },
  ];

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3 max-w-lg mx-auto">
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-6 animate-pulse h-10" />
        <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-6 animate-pulse h-56" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4" style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      {/* Page title */}
      <h1 className="text-xl font-bold text-[#FAFAFA]">Account</h1>

      {/* Tab bar */}
      <div className="flex border-b border-[#2A2A2A]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-[#F2FF66] border-[#F2FF66]'
                : 'text-[#888888] border-transparent hover:text-[#FAFAFA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== PROFILE TAB ===== */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          {/* Avatar + edit toggle */}
          <div className="flex items-start justify-between pt-1">
            <div className="flex flex-col items-center gap-2">
              {/* Avatar circle */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: '#2A2A2A' }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: '#F2FF66' }}>
                    {profile ? getInitials(profile) : '?'}
                  </span>
                )}
              </div>

              {/* Change photo button — only in edit mode */}
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium px-3 py-1 rounded-md border border-[#2A2A2A] text-[#F2FF66] hover:bg-[#1E1E1E] transition-colors"
                  >
                    Change photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            {/* Edit / Save / Cancel */}
            {!editing ? (
              <button
                onClick={() => { setProfileError(''); setProfileSuccess(''); setEditing(true); }}
                className="text-sm font-medium text-[#F2FF66] hover:underline"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="text-sm font-medium text-[#888888] hover:text-[#FAFAFA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-[#F2FF66] text-[#0A0A0A] hover:bg-[#E5F25E] transition-colors disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Feedback */}
          {profileError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-green-400 text-sm">
              {profileSuccess}
            </div>
          )}

          {/* Fields */}
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
            {/* First Name */}
            <div>
              <label className={labelClass}>First Name</label>
              {editing ? (
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="First name"
                />
              ) : (
                <p className="text-sm text-[#FAFAFA]">{firstName || <span className="text-[#555]">—</span>}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClass}>Last Name</label>
              {editing ? (
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Last name"
                />
              ) : (
                <p className="text-sm text-[#FAFAFA]">{lastName || <span className="text-[#555]">—</span>}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1">
                  Email
                  <svg
                    className="w-3 h-3 text-[#888888]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
              </label>
              <p className="text-sm text-[#888888]">{profile?.email || '—'}</p>
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="08012345678"
                />
              ) : (
                <p className="text-sm text-[#FAFAFA]">{phone || <span className="text-[#555]">—</span>}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SECURITY TAB ===== */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide mb-4">
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className={labelClass}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              {securityError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                  {securityError}
                </div>
              )}
              {securitySuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-green-400 text-sm">
                  {securitySuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={securitySaving}
                className="w-full bg-[#F2FF66] text-[#0A0A0A] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors disabled:opacity-50"
              >
                {securitySaving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOCATION TAB ===== */}
      {activeTab === 'location' && (
        <div className="space-y-4">
          <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide mb-1">
              Default Pickup Location
            </h2>
            <p className="text-xs text-[#888888] mb-4">
              Saved for pre-filling your order forms.
            </p>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className={labelClass}>Pickup Area</label>
                <select
                  value={pickupArea}
                  onChange={(e) => setPickupArea(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select area</option>
                  {Object.entries(LAGOS_ZONES).map(([zone, areas]) => (
                    <optgroup key={zone} label={zone}>
                      {areas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Pickup Address</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 12 Admiralty Way, Lekki"
                />
              </div>

              {locationError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                  {locationError}
                </div>
              )}
              {locationSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-green-400 text-sm">
                  {locationSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={locationSaving}
                className="w-full bg-[#F2FF66] text-[#0A0A0A] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#E5F25E] transition-colors disabled:opacity-50"
              >
                {locationSaving ? 'Saving…' : 'Save Location'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOGOUT ===== */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
