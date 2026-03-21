'use client';
import { DeliveryHistory, STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function Timeline({ history }: { history: DeliveryHistory[] }) {
  // Newest first
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-6">No history available.</div>
    );
  }

  return (
    <ol className="relative border-l border-gray-800 ml-3 space-y-0">
      {sorted.map((entry, i) => (
        <li key={entry.id} className="ml-6 pb-7 last:pb-0">
          {/* Timeline dot */}
          <span
            className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-[#0A0A0A] ${
              i === 0 ? 'bg-[#F2FF66]' : 'bg-[#191314] border border-gray-700'
            }`}
          >
            {i === 0 && <div className="w-2 h-2 rounded-full bg-black" />}
          </span>

          <div className="flex flex-col gap-1">
            {/* Timestamp */}
            <time className="text-xs text-gray-500 leading-none">
              {formatTimestamp(entry.timestamp)}
            </time>

            {/* Description — primary, prominent */}
            <p className="text-sm font-medium text-[#FAFAFA] leading-snug">
              {entry.note || STATUS_LABELS[entry.status] || entry.status}
            </p>

            {/* Status badge — secondary */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={entry.status} />
              <span className="text-xs text-gray-600 capitalize">
                via {entry.triggered_by}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
