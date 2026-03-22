'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  SearchNormal1, Setting4,
  DocumentDownload, TickSquare, CloseSquare, People,
  Refresh2, ArrowDown2, ArrowUp2, Trash,
} from 'iconsax-react';
import type { CustomerRecord, RecipientRecord, BusinessRecord } from '@/app/api/customers/route';

/* ─── Types ──────────────────────────────────────────────────── */
type Tab = 'customers' | 'recipients' | 'businesses';
type SortDir = 'asc' | 'desc';

/* ─── Sort options per tab ───────────────────────────────────── */
const SORT_OPTIONS: Record<Tab, { key: string; label: string }[]> = {
  customers: [
    { key: 'last_order_date',  label: 'Last update' },
    { key: 'first_order_date', label: 'Date added as customer' },
    { key: 'order_count',      label: 'Total orders' },
    { key: 'completed_orders', label: 'Completed orders' },
    { key: 'total_spent',      label: 'Amount spent' },
    { key: 'name',             label: 'Name' },
  ],
  recipients: [
    { key: 'last_delivery_date',  label: 'Last update' },
    { key: 'first_delivery_date', label: 'Date added as recipient' },
    { key: 'delivery_count',      label: 'Total deliveries' },
    { key: 'name',                label: 'Name' },
  ],
  businesses: [
    { key: 'date_added',      label: 'Date added' },
    { key: 'last_order_date', label: 'Last update' },
    { key: 'order_count',     label: 'Total orders' },
    { key: 'total_spent',     label: 'Amount spent' },
    { key: 'business_name',   label: 'Business name' },
  ],
};

/* ─── Sort field type + direction labels ─────────────────────── */
const DATE_KEYS  = new Set(['last_order_date', 'first_order_date', 'last_delivery_date', 'first_delivery_date', 'date_added']);
const NUMBER_KEYS = new Set(['order_count', 'completed_orders', 'total_spent', 'delivery_count']);

function getSortFieldType(key: string): 'date' | 'number' | 'name' {
  if (DATE_KEYS.has(key))   return 'date';
  if (NUMBER_KEYS.has(key)) return 'number';
  return 'name';
}

function getDirLabels(key: string): { asc: string; desc: string } {
  const type = getSortFieldType(key);
  if (type === 'number') return { asc: 'Lowest to highest', desc: 'Highest to lowest' };
  if (type === 'name')   return { asc: 'Ascending (A → Z)',  desc: 'Descending (Z → A)' };
  return { asc: 'Oldest to newest', desc: 'Newest to oldest' };
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtNaira(n: number): string {
  return n > 0 ? `₦${n.toLocaleString('en-NG')}` : '—';
}
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

/* ─── CSV / Excel Export ─────────────────────────────────────── */
function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
}

async function exportExcel(headers: string[], rows: (string | number)[][], sheetName: string, filename: string) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/* ─── Column config ──────────────────────────────────────────── */
interface ColDef<T> {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  render: (row: T) => string | number | React.ReactNode;
  csv: (row: T) => string | number;
}

const CUSTOMER_COLS: ColDef<CustomerRecord>[] = [
  { key: 'name',             label: 'Name',            visible: true,  sortable: true,  render: r => r.name || '—',                        csv: r => r.name },
  { key: 'phone',            label: 'Phone',           visible: true,  sortable: false, render: r => r.phone,                              csv: r => r.phone },
  { key: 'email',            label: 'Email',           visible: true,  sortable: false, render: r => r.email || '—',                       csv: r => r.email },
  { key: 'location',         label: 'Area',            visible: true,  sortable: false, render: r => r.location || '—',                    csv: r => r.location },
  { key: 'address',          label: 'Address',         visible: true,  sortable: false, render: r => r.address || '—',                     csv: r => r.address },
  { key: 'order_count',      label: 'Total Orders',    visible: true,  sortable: true,  render: r => r.order_count,                        csv: r => r.order_count },
  { key: 'completed_orders', label: 'Completed',       visible: true,  sortable: true,  render: r => r.completed_orders,                   csv: r => r.completed_orders },
  { key: 'total_spent',      label: 'Total Spent',     visible: true,  sortable: true,  render: r => fmtNaira(r.total_spent),              csv: r => r.total_spent },
  { key: 'last_order_date',  label: 'Last Order',      visible: true,  sortable: true,  render: r => fmtDate(r.last_order_date),           csv: r => fmtDate(r.last_order_date) },
  { key: 'first_order_date', label: 'First Order',     visible: false, sortable: true,  render: r => fmtDate(r.first_order_date),          csv: r => fmtDate(r.first_order_date) },
];

const RECIPIENT_COLS: ColDef<RecipientRecord>[] = [
  { key: 'name',                label: 'Name',            visible: true,  sortable: true,  render: r => r.name || '—',                     csv: r => r.name },
  { key: 'phone',               label: 'Phone',           visible: true,  sortable: false, render: r => r.phone,                           csv: r => r.phone },
  { key: 'location',            label: 'Area',            visible: true,  sortable: false, render: r => r.location || '—',                 csv: r => r.location },
  { key: 'address',             label: 'Address',         visible: true,  sortable: false, render: r => r.address || '—',                  csv: r => r.address },
  { key: 'delivery_count',      label: 'Deliveries',      visible: true,  sortable: true,  render: r => r.delivery_count,                  csv: r => r.delivery_count },
  { key: 'last_delivery_date',  label: 'Last Delivery',   visible: true,  sortable: true,  render: r => fmtDate(r.last_delivery_date),     csv: r => fmtDate(r.last_delivery_date) },
  { key: 'first_delivery_date', label: 'First Delivery',  visible: false, sortable: true,  render: r => fmtDate(r.first_delivery_date),    csv: r => fmtDate(r.first_delivery_date) },
];

const BUSINESS_COLS: ColDef<BusinessRecord>[] = [
  { key: 'business_name', label: 'Business',       visible: true,  sortable: true,  render: r => r.business_name || '—',          csv: r => r.business_name },
  { key: 'contact_name',  label: 'Contact',        visible: true,  sortable: false, render: r => r.contact_name || '—',           csv: r => r.contact_name },
  { key: 'email',         label: 'Email',          visible: true,  sortable: false, render: r => r.email || '—',                  csv: r => r.email },
  { key: 'phone',         label: 'Phone',          visible: true,  sortable: false, render: r => r.phone || '—',                  csv: r => r.phone },
  { key: 'address',       label: 'Address',        visible: true,  sortable: false, render: r => r.address || '—',                csv: r => r.address },
  { key: 'business_type', label: 'Type',           visible: true,  sortable: false, render: r => r.business_type || '—',          csv: r => r.business_type },
  { key: 'state',         label: 'State',          visible: true,  sortable: false, render: r => r.state || '—',                  csv: r => r.state },
  { key: 'order_count',   label: 'Orders',         visible: true,  sortable: true,  render: r => r.order_count,                   csv: r => r.order_count },
  { key: 'total_spent',   label: 'Total Spent',    visible: true,  sortable: true,  render: r => fmtNaira(r.total_spent),         csv: r => r.total_spent },
  { key: 'last_order_date', label: 'Last Order',   visible: true,  sortable: true,  render: r => fmtDate(r.last_order_date),      csv: r => fmtDate(r.last_order_date) },
  { key: 'date_added',    label: 'Date Added',     visible: true,  sortable: true,  render: r => fmtDate(r.date_added),           csv: r => fmtDate(r.date_added) },
];

/* ─── Sort helper ────────────────────────────────────────────── */
function sortRows<T>(rows: T[], key: string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    let cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else if (typeof av === 'string' && typeof bv === 'string') {
      const ad = new Date(av).getTime(), bd = new Date(bv).getTime();
      cmp = (!isNaN(ad) && !isNaN(bd)) ? ad - bd : av.localeCompare(bv);
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

/* ─── Sort Panel ─────────────────────────────────────────────── */
function SortPanel({
  options, sortKey, sortDir, onChangeKey, onChangeDir,
}: {
  options: { key: string; label: string }[];
  sortKey: string;
  sortDir: SortDir;
  onChangeKey: (key: string) => void;
  onChangeDir: (dir: SortDir) => void;
}) {
  const { asc: ascLabel, desc: descLabel } = getDirLabels(sortKey);

  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl overflow-hidden w-64">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-[#a1a4a5] uppercase tracking-wider mb-3">Sort by</p>
        <div className="space-y-1">
          {options.map(opt => {
            const active = sortKey === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onChangeKey(opt.key)}
                className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded-lg transition-colors
                  ${active ? 'bg-[rgba(255,255,255,0.06)]' : 'hover:bg-[rgba(255,255,255,0.04)]'}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${active ? 'border-[#F2FF66]' : 'border-[rgba(255,255,255,0.2)]'}`}
                >
                  {active && <div className="w-2 h-2 rounded-full bg-[#F2FF66]" />}
                </div>
                <span className={`text-sm transition-colors ${active ? 'text-[#f0f0f0] font-medium' : 'text-[#a1a4a5]'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-[rgba(255,255,255,0.08)] mt-2">
        <button
          onClick={() => onChangeDir('asc')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
            ${sortDir === 'asc'
              ? 'bg-[rgba(255,255,255,0.06)] text-[#f0f0f0]'
              : 'text-[#a1a4a5] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0f0f0]'}`}
        >
          <ArrowUp2 size={15} color="currentColor" />
          {ascLabel}
        </button>
        <button
          onClick={() => onChangeDir('desc')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
            ${sortDir === 'desc'
              ? 'bg-[rgba(255,255,255,0.06)] text-[#f0f0f0]'
              : 'text-[#a1a4a5] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0f0f0]'}`}
        >
          <ArrowDown2 size={15} color="currentColor" />
          {descLabel}
        </button>
      </div>
    </div>
  );
}

/* ─── Column visibility panel ────────────────────────────────── */
function ColVisPanel<T>({
  cols, onChange, onClose,
}: {
  cols: ColDef<T>[];
  onChange: (key: string, v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#f0f0f0] uppercase tracking-wider">Columns</span>
        <button onClick={onClose} className="text-[#a1a4a5] hover:text-[#f0f0f0]">
          <CloseSquare size={16} color="currentColor" />
        </button>
      </div>
      <div className="space-y-1.5">
        {cols.map(c => (
          <label key={c.key} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={c.visible}
              onChange={e => onChange(c.key, e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[rgba(255,255,255,0.2)] accent-[#F2FF66]"
            />
            <span className="text-xs text-[#a1a4a5] group-hover:text-[#f0f0f0] transition-colors">{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ─── Column header sort icon ────────────────────────────────── */
function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: SortDir }) {
  if (col !== sortKey) return <ArrowDown2 size={12} color="currentColor" className="opacity-30" />;
  return dir === 'asc'
    ? <ArrowUp2 size={12} color="currentColor" />
    : <ArrowDown2 size={12} color="currentColor" />;
}

/* ─── Generic Table ──────────────────────────────────────────── */
function DataTable<T extends object>({
  rows, cols, sortKey, sortDir, onSort,
  selected, onToggle, onToggleAll, idKey,
}: {
  rows: T[];
  cols: ColDef<T>[];
  sortKey: string;
  sortDir: SortDir;
  onSort: (key: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  idKey: keyof T;
}) {
  const visibleCols = cols.filter(c => c.visible);
  const allSelected = rows.length > 0 && rows.every(r => selected.has(String(r[idKey])));
  const someSelected = rows.some(r => selected.has(String(r[idKey])));

  if (rows.length === 0) {
    return <div className="text-center py-16 text-[#a1a4a5] text-sm">No records found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.08)]">
            <th className="w-10 px-3 py-2.5 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={onToggleAll}
                className="w-3.5 h-3.5 accent-[#F2FF66] cursor-pointer"
              />
            </th>
            {visibleCols.map(c => (
              <th
                key={c.key}
                className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#a1a4a5] whitespace-nowrap
                  ${c.sortable ? 'cursor-pointer hover:text-[#f0f0f0] select-none' : ''}`}
                onClick={c.sortable ? () => onSort(c.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable && <SortIcon col={c.key} sortKey={sortKey} dir={sortDir} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = String(row[idKey]);
            const isSelected = selected.has(id);
            return (
              <tr
                key={id}
                className={`border-b border-[rgba(255,255,255,0.04)] transition-colors
                  ${isSelected ? 'bg-[rgba(242,255,102,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(id)}
                    className="w-3.5 h-3.5 accent-[#F2FF66] cursor-pointer"
                  />
                </td>
                {visibleCols.map(c => (
                  <td key={c.key} className="px-3 py-3 text-[#f0f0f0] whitespace-nowrap max-w-[200px] truncate">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function AdminCustomersPage() {
  const router = useRouter();

  // ── Data ──
  const [customers, setCustomers]   = useState<CustomerRecord[]>([]);
  const [recipients, setRecipients] = useState<RecipientRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── UI state ──
  const [tab, setTab]               = useState<Tab>('customers');
  const [search, setSearch]         = useState('');
  const [sortKey, setSortKey]       = useState('last_order_date');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [showColPanel, setShowColPanel]   = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  // ── Column visibility (per tab) ──
  const [custCols, setCustCols]   = useState(CUSTOMER_COLS);
  const [recipCols, setRecipCols] = useState(RECIPIENT_COLS);
  const [bizCols, setBizCols]     = useState(BUSINESS_COLS);

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const colPanelRef   = useRef<HTMLDivElement>(null);
  const sortPanelRef  = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // ── Auth ──
  const getToken = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/bb-admin');
    return token;
  }, [router]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setRecipients(data.recipients ?? []);
      setBusinesses(data.businesses ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Close panels on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPanelRef.current && !colPanelRef.current.contains(e.target as Node)) setShowColPanel(false);
      if (sortPanelRef.current && !sortPanelRef.current.contains(e.target as Node)) setShowSortPanel(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Sort key reset on tab change ──
  useEffect(() => {
    setSortKey(tab === 'recipients' ? 'last_delivery_date' : tab === 'businesses' ? 'date_added' : 'last_order_date');
    setSortDir('desc');
    setSelectedIds(new Set());
    setSearch('');
    setShowSortPanel(false);
  }, [tab]);

  // ── Filter + sort ──
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? customers.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q))
      : customers;
    return sortRows(filtered, sortKey, sortDir);
  }, [customers, search, sortKey, sortDir]);

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? recipients.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q))
      : recipients;
    return sortRows(filtered, sortKey, sortDir);
  }, [recipients, search, sortKey, sortDir]);

  const filteredBusinesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? businesses.filter(b =>
          b.business_name.toLowerCase().includes(q) ||
          b.contact_name.toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q))
      : businesses;
    return sortRows(filtered, sortKey, sortDir);
  }, [businesses, search, sortKey, sortDir]);

  // ── Active rows/cols ──
  const activeRows = tab === 'customers' ? filteredCustomers : tab === 'recipients' ? filteredRecipients : filteredBusinesses;
  const activeCols = tab === 'customers' ? custCols         : tab === 'recipients' ? recipCols          : bizCols;
  const idKey: string = tab === 'customers' ? 'phone'       : tab === 'recipients' ? 'phone'            : 'email';

  function toggleColVisibility(key: string, val: boolean) {
    if (tab === 'customers') setCustCols(prev => prev.map(c => c.key === key ? { ...c, visible: val } : c));
    else if (tab === 'recipients') setRecipCols(prev => prev.map(c => c.key === key ? { ...c, visible: val } : c));
    else setBizCols(prev => prev.map(c => c.key === key ? { ...c, visible: val } : c));
  }

  // ── Sort ──
  function handleSort(key: string) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  // ── Selection ──
  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = activeRows.map(r => String((r as any)[idKey]));
    const allSelected = ids.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    }
  }

  // ── Export ──
  function getExportRows(scope: 'all' | 'selected' | 'filtered') {
    const pool = scope === 'all'
      ? (tab === 'customers' ? customers : tab === 'recipients' ? recipients : businesses)
      : activeRows;
    if (scope === 'selected' && selectedIds.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (pool as any[]).filter(r => selectedIds.has(String(r[idKey])));
    }
    return pool;
  }

  async function handleExport(format: 'csv' | 'excel', scope: 'all' | 'selected' | 'filtered') {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const rows = getExportRows(scope);
      const cols = activeCols.filter(c => c.visible);
      const headers = cols.map(c => c.label);
      const dataRows = (rows as never[]).map(r => cols.map(c => c.csv(r)));
      const ts = new Date().toISOString().slice(0, 10);
      const name = `blackbox-${tab}-${ts}`;

      if (format === 'csv') {
        const csv = toCSV(headers, dataRows);
        downloadFile(new Blob([csv], { type: 'text/csv' }), `${name}.csv`);
      } else {
        await exportExcel(headers, dataRows, tab, `${name}.xlsx`);
      }
    } finally { setExporting(false); }
  }

  // ── Delete ──
  async function handleDelete() {
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phones = Array.from(selectedIds).filter(id => activeRows.some(r => String((r as any)[idKey]) === id));
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phones, tab }),
      });
      if (!res.ok) throw new Error('Failed');
      setSelectedIds(new Set());
      setDeleteModal(false);
      await fetchData();
    } catch { /* silent */ }
    finally { setDeleting(false); }
  }

  const selCount = selectedIds.size;

  /* ── Tabs ── */
  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'customers',  label: 'Customers',  count: customers.length },
    { key: 'recipients', label: 'Recipients', count: recipients.length },
    { key: 'businesses', label: 'Businesses', count: businesses.length },
  ];

  const currentSortLabel = SORT_OPTIONS[tab].find(o => o.key === sortKey)?.label ?? '';

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0]">
      <div className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f0]">Customers</h1>
            <p className="text-[#a1a4a5] text-sm mt-0.5">Manage senders, recipients, and business accounts</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-[#a1a4a5] hover:text-[#f0f0f0] border border-[rgba(255,255,255,0.08)] hover:border-[#212629] px-3 py-2 rounded-lg text-xs transition-colors"
          >
            <Refresh2 size={14} color="currentColor" className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Summary stat cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`bg-[#070707] border rounded-xl p-4 text-left transition-colors
                ${tab === t.key ? 'border-[rgba(255,255,255,0.2)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[#212629]'}`}
            >
              <p className="text-[#a1a4a5] text-xs uppercase tracking-wider">{t.label}</p>
              <p className="text-2xl font-bold mt-1 text-[#f0f0f0]">
                {loading
                  ? <span className="inline-block w-8 h-6 bg-[rgba(255,255,255,0.08)] rounded animate-pulse align-middle" />
                  : t.count}
              </p>
            </button>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.key ? 'text-[#f0f0f0]' : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f0f0f0] rounded-t" />}
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a4a5]">
              <SearchNormal1 size={14} color="currentColor" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#f0f0f0] placeholder:text-[#a1a4a5] focus:outline-none focus:border-[#212629] transition-colors"
            />
          </div>

          {/* Sort icon button */}
          <div className="relative" ref={sortPanelRef}>
            <button
              onClick={() => setShowSortPanel(v => !v)}
              title={`Sort: ${currentSortLabel} (${sortDir === 'asc' ? 'oldest first' : 'newest first'})`}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-colors
                ${showSortPanel
                  ? 'bg-[#18191c] border-[rgba(255,255,255,0.12)] text-[#f0f0f0]'
                  : 'bg-[#070707] border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0] hover:border-[#212629]'
                }`}
            >
              {/* Custom sort icon: stacked up/down arrows */}
              <span className="flex flex-col gap-[2px] leading-none">
                <ArrowUp2 size={9} color="currentColor" />
                <ArrowDown2 size={9} color="currentColor" />
              </span>
              <span className="hidden sm:inline">Sort</span>
            </button>
            {showSortPanel && (
              <SortPanel
                options={SORT_OPTIONS[tab]}
                sortKey={sortKey}
                sortDir={sortDir}
                onChangeKey={(key) => { setSortKey(key); }}
                onChangeDir={(dir) => { setSortDir(dir); }}
              />
            )}
          </div>

          {/* Columns toggle */}
          <div className="relative" ref={colPanelRef}>
            <button
              onClick={() => setShowColPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-colors
                ${showColPanel
                  ? 'bg-[#18191c] border-[rgba(255,255,255,0.12)] text-[#f0f0f0]'
                  : 'bg-[#070707] border-[rgba(255,255,255,0.08)] text-[#a1a4a5] hover:text-[#f0f0f0] hover:border-[#212629]'
                }`}
            >
              <Setting4 size={14} color="currentColor" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {showColPanel && (
              <ColVisPanel
                cols={activeCols as ColDef<never>[]}
                onChange={toggleColVisibility}
                onClose={() => setShowColPanel(false)}
              />
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Selection info */}
          {selCount > 0 && (
            <span className="text-xs text-[#a1a4a5]">
              <span className="text-[#f0f0f0] font-semibold">{selCount}</span> selected
            </span>
          )}

          {/* Export */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#070707] border border-[rgba(255,255,255,0.08)] hover:border-[#212629] text-[#a1a4a5] hover:text-[#f0f0f0] rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {exporting
                ? <Refresh2 size={14} color="currentColor" className="animate-spin" />
                : <DocumentDownload size={14} color="currentColor" />
              }
              Export
              <ArrowDown2 size={11} color="currentColor" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden w-52">
                <p className="text-[10px] uppercase tracking-wider text-[#a1a4a5] px-4 pt-3 pb-1 font-semibold">CSV</p>
                {(['all', 'filtered', 'selected'] as const).map(scope => (
                  <button key={scope} onClick={() => handleExport('csv', scope)}
                    disabled={scope === 'selected' && selCount === 0}
                    className="w-full text-left px-4 py-2 text-xs text-[#a1a4a5] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f0f0f0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed capitalize">
                    {scope === 'all' ? 'All records' : scope === 'filtered' ? 'Current view' : `Selected (${selCount})`}
                  </button>
                ))}
                <div className="border-t border-[rgba(255,255,255,0.08)] my-1" />
                <p className="text-[10px] uppercase tracking-wider text-[#a1a4a5] px-4 pt-1 pb-1 font-semibold">Excel (.xlsx)</p>
                {(['all', 'filtered', 'selected'] as const).map(scope => (
                  <button key={scope} onClick={() => handleExport('excel', scope)}
                    disabled={scope === 'selected' && selCount === 0}
                    className="w-full text-left px-4 py-2 text-xs text-[#a1a4a5] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f0f0f0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed capitalize">
                    {scope === 'all' ? 'All records' : scope === 'filtered' ? 'Current view' : `Selected (${selCount})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Record count ── */}
        {!loading && (
          <p className="text-xs text-[#a1a4a5]">
            Showing <span className="text-[#f0f0f0] font-medium">{activeRows.length}</span>
            {search && ` of ${tab === 'customers' ? customers.length : tab === 'recipients' ? recipients.length : businesses.length}`} records
          </p>
        )}

        {/* ── Table ── */}
        <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#a1a4a5] text-sm">
              <People size={20} color="currentColor" className="opacity-40" />
              Loading…
            </div>
          ) : tab === 'customers' ? (
            <DataTable<CustomerRecord>
              rows={filteredCustomers} cols={custCols}
              sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              selected={selectedIds} onToggle={toggleRow} onToggleAll={toggleAll}
              idKey="phone"
            />
          ) : tab === 'recipients' ? (
            <DataTable<RecipientRecord>
              rows={filteredRecipients} cols={recipCols}
              sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              selected={selectedIds} onToggle={toggleRow} onToggleAll={toggleAll}
              idKey="phone"
            />
          ) : (
            <DataTable<BusinessRecord>
              rows={filteredBusinesses} cols={bizCols}
              sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
              selected={selectedIds} onToggle={toggleRow} onToggleAll={toggleAll}
              idKey="email"
            />
          )}
        </div>

        {/* ── Selection action bar ── */}
        {selCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0d0d0d] border border-[rgba(255,255,255,0.12)] rounded-2xl px-5 py-3 shadow-2xl">
            <TickSquare size={16} color="#F2FF66" />
            <span className="text-sm text-[#f0f0f0] font-medium">{selCount} selected</span>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.12)]" />
            <button onClick={() => handleExport('csv', 'selected')} className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors">Export CSV</button>
            <button onClick={() => handleExport('excel', 'selected')} className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors">Export Excel</button>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.12)]" />
            <button
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-1.5 text-xs text-[#a85858] hover:text-red-300 transition-colors"
            >
              <Trash size={13} color="currentColor" />
              Delete
            </button>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.12)]" />
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors">Clear</button>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(168,88,88,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash size={18} color="#a85858" />
              </div>
              <div>
                <p className="text-[#f0f0f0] font-semibold">
                  Delete {selCount} record{selCount > 1 ? 's' : ''}?
                </p>
                <p className="text-[#a1a4a5] text-xs mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[#a1a4a5] mb-5 leading-relaxed">
              {tab === 'customers'
                ? 'All deliveries associated with these customers will be permanently deleted, along with their registered accounts.'
                : tab === 'recipients'
                ? 'All deliveries associated with these recipients will be permanently deleted.'
                : 'These business accounts will be permanently removed from the system.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-sm text-[#a1a4a5] hover:text-[#f0f0f0] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-[rgba(168,88,88,0.15)] border border-[rgba(168,88,88,0.3)] text-sm text-[#a85858] hover:bg-[rgba(168,88,88,0.25)] hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
