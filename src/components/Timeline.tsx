'use client';
import { DeliveryHistory, STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function Timeline({ history }: { history: DeliveryHistory[] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-6">No history available.</div>
    );
  }

  return (
    <ol className="relative border-l border-gray-800 ml-3 space-y-6">
      {sorted.map((entry, i) => (
        <li key={entry.id} className="ml-6">
          {/* Dot on the timeline */}
          <span
            className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-[#0A0A0A] ${
              i === 0 ? 'bg-[#F2FF66]' : 'bg-gray-700'
            }`}
          >
            {i === 0 && (
              <div className="w-2 h-2 rounded-full bg-black" />
            )}
          </span>

          <div className="flex flex-col gap-1.5">
            {/* Timestamp */}
            <time className="text-xs font-normal text-gray-500">
              {formatTimestamp(entry.timestamp)}
            </time>

            {/* Status badge */}
            <div>
              <StatusBadge status={entry.status} />
            </div>

            {/* Triggered by */}
            <p className="text-xs text-gray-600 capitalize">
              Updated by {entry.triggered_by}
            </p>

            {/* Note */}
            {entry.note && (
              <p className="text-sm text-gray-300 bg-gray-900 rounded-lg px-3 py-2">
                {entry.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
