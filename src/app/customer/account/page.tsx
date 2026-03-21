'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LAGOS_ZONES } from '@/lib/types';

type Tab = 'profile' | 'security' | 'location' | 'team';

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
  business_id?: number | null;
  business_role?: string | null;
  account_type?: string | null;
}

interface Business {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: string | null;
  state: string | null;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  business_role: string;
  account_type: string;
  created_at: string;
}

interface Invite {
  id: number;
  email: string;
  role: string;
  created_at: string;
  status: string;
  expires_at: string;
  token?: string;
}

const BUSINESS_TYPES = [
  'Retail',
  'E-commerce',
  'Fashion',
  'Food & Beverage',
  'Pharmacy/Health',
  'Logistics',
  'Technology',
  'Other',
];

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

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
        isAdmin
          ? 'bg-[#F2FF66]/15 text-[#F2FF66]'
          : 'bg-[#2A2A2A] text-[#888888]'
      }`}
    >
      {role}
    </span>
  );
}

// ===== Invite Modal =====
function InviteModal({
  onClose,
  onSent,
  token,
}: {
  onClose: () => void;
  onSent: () => void;
  token: string;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'basic'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) { setError('Email is required'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/business/invite', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send invite'); setLoading(false); return; }
      onSent();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm bg-[#191314] border border-[#2A2A2A] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#FAFAFA]">Invite Team Member</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-[#FAFAFA] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs text-[#888888] mb-1.5">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              disabled={loading}
              className="w-full rounded-lg bg-[#232023] border border-gray-700 text-[#FAFAFA] px-3 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#F2FF66] focus:ring-1 focus:ring-[#F2FF66] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs text-[#888888] mb-2">Role</label>
            <div className="flex gap-2">
              {/* Admin card */}
              <button
                type="button"
                onClick={() => setInviteRole('admin')}
                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                  inviteRole === 'admin'
                    ? 'border-[#F2FF66] bg-[#F2FF66]/5'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#F2FF66]/40'
                }`}
              >
                <p className={`text-sm font-semibold mb-1.5 ${inviteRole === 'admin' ? 'text-[#F2FF66]' : 'text-[#FAFAFA]'}`}>
                  Admin
                </p>
                <ul className="space-y-1">
                  {['Create shipments', 'Edit orders', 'Manage users', 'Top-up wallets'].map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-[#888888]">
                      <svg className="w-3 h-3 text-[#F2FF66]/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </button>

              {/* Basic card */}
              <button
                type="button"
                onClick={() => setInviteRole('basic')}
                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                  inviteRole === 'basic'
                    ? 'border-[#F2FF66] bg-[#F2FF66]/5'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#F2FF66]/40'
                }`}
              >
                <p className={`text-sm font-semibold mb-1.5 ${inviteRole === 'basic' ? 'text-[#F2FF66]' : 'text-[#FAFAFA]'}`}>
                  Basic
                </p>
                <ul className="space-y-1">
                  {['Create shipments'].map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-[#888888]">
                      <svg className="w-3 h-3 text-[#F2FF66]/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F2FF66] text-[#0A0A0A] py-3 rounded-lg text-sm font-bold hover:bg-[#e8f55c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending...
              </>
            ) : (
              'Send Invite'
            )}
          </button>
        </form>
      </div>
    </div>
  );
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

  // --- Team tab state ---
  const [business, setBusiness] = useState<Business | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Business profile editing
  const [editingBiz, setEditingBiz] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState('');
  const [bizSuccess, setBizSuccess] = useState('');

  // Auth token and customer info
  const [authToken, setAuthToken] = useState('');
  const [hasBusiness, setHasBusiness] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('customer_token');
      if (!token) {
        router.replace('/customer');
        return;
      }
      setAuthToken(token);

      // Read business info from localStorage
      try {
        const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
        if (info.business_id) {
          setHasBusiness(true);
          setIsAdmin(info.business_role === 'admin');
        }
      } catch {
        // ignore
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

          // Update business state from profile
          if (data.business_id) {
            setHasBusiness(true);
            setIsAdmin(data.business_role === 'admin');
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  async function fetchTeamData(token: string) {
    setTeamLoading(true);
    setTeamError('');
    try {
      const [bizRes, membersRes, invitesRes] = await Promise.all([
        fetch('/api/business/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/business/users', { headers: { Authorization: `Bearer ${token}` } }),
        isAdmin
          ? fetch('/api/business/invite', { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null),
      ]);

      if (bizRes.ok) {
        const { business: biz } = await bizRes.json();
        setBusiness(biz);
        setBizName(biz.name || '');
        setBizEmail(biz.email || '');
        setBizPhone(biz.phone || '');
        setBizAddress(biz.address || '');
        setBizType(biz.type || '');
      }

      if (membersRes.ok) {
        const { users } = await membersRes.json();
        setTeamMembers(users || []);
      }

      if (invitesRes && invitesRes.ok) {
        const { invites: inv } = await invitesRes.json();
        setInvites(inv || []);
      }
    } catch {
      setTeamError('Failed to load team data.');
    } finally {
      setTeamLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'team' && hasBusiness && authToken) {
      fetchTeamData(authToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasBusiness, authToken]);

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

  // ---- Business profile handler ----
  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault();
    setBizError('');
    setBizSuccess('');

    if (!bizName.trim()) { setBizError('Business name is required.'); return; }

    setBizSaving(true);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'PATCH',
        headers: authHeaders(authToken),
        body: JSON.stringify({
          name: bizName,
          email: bizEmail || null,
          phone: bizPhone || null,
          address: bizAddress || null,
          type: bizType || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBusiness(data.business);
        setEditingBiz(false);
        setBizSuccess('Business profile updated.');
      } else {
        setBizError(data.error || 'Failed to update business profile.');
      }
    } catch {
      setBizError('Network error. Please try again.');
    } finally {
      setBizSaving(false);
    }
  }

  // ---- Team member role update ----
  async function handleRoleChange(memberId: number, newRole: string) {
    try {
      const res = await fetch(`/api/business/users/${memberId}`, {
        method: 'PATCH',
        headers: authHeaders(authToken),
        body: JSON.stringify({ business_role: newRole }),
      });

      if (res.ok) {
        setTeamMembers((prev) =>
          prev.map((m) => m.id === memberId ? { ...m, business_role: newRole } : m)
        );
      }
    } catch {
      // silent
    }
  }

  // ---- Remove team member ----
  async function handleRemoveMember(memberId: number) {
    if (!confirm('Remove this user from your business?')) return;

    try {
      const res = await fetch(`/api/business/users/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(authToken),
      });

      if (res.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // silent
    }
  }

  // ---- Cancel invite ----
  async function handleCancelInvite(inviteToken: string) {
    try {
      const res = await fetch(`/api/business/invite/${inviteToken}`, {
        method: 'DELETE',
        headers: authHeaders(authToken),
      });

      if (res.ok) {
        await fetchTeamData(authToken);
      }
    } catch {
      // silent
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

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'profile', label: 'Profile', visible: true },
    { id: 'security', label: 'Security', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'team', label: 'Team', visible: hasBusiness },
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
      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          token={authToken}
          onClose={() => setShowInviteModal(false)}
          onSent={() => {
            setShowInviteModal(false);
            fetchTeamData(authToken);
          }}
        />
      )}

      {/* Page title */}
      <h1 className="text-xl font-bold text-[#FAFAFA]">Account</h1>

      {/* Tab bar */}
      <div className="flex border-b border-[#2A2A2A]">
        {tabs.filter((t) => t.visible).map((tab) => (
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

      {/* ===== TEAM TAB ===== */}
      {activeTab === 'team' && hasBusiness && (
        <div className="space-y-5">
          {teamLoading ? (
            <div className="space-y-3">
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5 animate-pulse h-32" />
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5 animate-pulse h-48" />
            </div>
          ) : (
            <>
              {teamError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {teamError}
                </div>
              )}

              {/* Business Profile Section */}
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide">
                    Business Profile
                  </h2>
                  {isAdmin && !editingBiz && (
                    <button
                      onClick={() => { setBizError(''); setBizSuccess(''); setEditingBiz(true); }}
                      className="text-xs font-medium text-[#F2FF66] hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {bizError && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {bizError}
                  </div>
                )}
                {bizSuccess && (
                  <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                    {bizSuccess}
                  </div>
                )}

                {editingBiz ? (
                  <form onSubmit={handleSaveBusiness} className="space-y-3">
                    <div>
                      <label className={labelClass}>Business Name</label>
                      <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputClass} placeholder="Acme Corp" required />
                    </div>
                    <div>
                      <label className={labelClass}>Business Email</label>
                      <input type="email" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} className={inputClass} placeholder="info@company.com" />
                    </div>
                    <div>
                      <label className={labelClass}>Business Phone</label>
                      <input type="tel" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} className={inputClass} placeholder="08012345678" />
                    </div>
                    <div>
                      <label className={labelClass}>Business Address</label>
                      <input type="text" value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} className={inputClass} placeholder="12 Admiralty Way, Lekki" />
                    </div>
                    <div>
                      <label className={labelClass}>Business Type</label>
                      <select value={bizType} onChange={(e) => setBizType(e.target.value)} className={inputClass}>
                        <option value="">Select type</option>
                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setEditingBiz(false); setBizError(''); }}
                        className="flex-1 py-2 text-sm text-[#888888] border border-[#2A2A2A] rounded-lg hover:text-[#FAFAFA] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={bizSaving}
                        className="flex-1 py-2 text-sm font-semibold bg-[#F2FF66] text-[#0A0A0A] rounded-lg hover:bg-[#E5F25E] transition-colors disabled:opacity-50"
                      >
                        {bizSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className={labelClass}>Name</p>
                      <p className="text-sm text-[#FAFAFA]">{business?.name || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Type</p>
                      <p className="text-sm text-[#FAFAFA]">{business?.type || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Address</p>
                      <p className="text-sm text-[#FAFAFA]">{business?.address || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Email</p>
                      <p className="text-sm text-[#FAFAFA]">{business?.email || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Phone</p>
                      <p className="text-sm text-[#FAFAFA]">{business?.phone || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide">
                    Team Members ({teamMembers.length})
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[#F2FF66] text-[#0A0A0A] rounded-lg hover:bg-[#E5F25E] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Invite User
                    </button>
                  )}
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-sm text-[#555] text-center py-4">No team members yet.</p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const isSelf = member.id === profile?.id;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-[#FAFAFA] font-medium truncate">{member.name}</p>
                              {isSelf && (
                                <span className="text-xs px-1.5 py-0.5 bg-[#2A2A2A] text-[#888888] rounded">You</span>
                              )}
                              <RoleBadge role={member.business_role} />
                            </div>
                            <p className="text-xs text-[#888888] truncate mt-0.5">{member.email}</p>
                          </div>

                          {isAdmin && !isSelf && (
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <select
                                value={member.business_role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="text-xs bg-[#0A0A0A] border border-[#2A2A2A] text-[#FAFAFA] rounded px-2 py-1 focus:outline-none focus:border-[#F2FF66]/50"
                              >
                                <option value="admin">Admin</option>
                                <option value="basic">Basic</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                title="Remove from business"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pending Invites — admin only */}
              {isAdmin && (
                <div className="bg-[#191314] border border-[#2A2A2A] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-wide mb-4">
                    Pending Invites ({invites.filter((i) => i.status === 'pending').length})
                  </h2>

                  {invites.filter((i) => i.status === 'pending').length === 0 ? (
                    <p className="text-sm text-[#555] text-center py-2">No pending invites.</p>
                  ) : (
                    <div className="space-y-3">
                      {invites
                        .filter((inv) => inv.status === 'pending')
                        .map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[#FAFAFA] truncate">{inv.email}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <RoleBadge role={inv.role} />
                                <span className="text-xs text-[#888888]">
                                  Sent {new Date(inv.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => inv.token && handleCancelInvite(inv.token)}
                              className="ml-3 text-xs text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                              title="Cancel invite"
                            >
                              Cancel
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
