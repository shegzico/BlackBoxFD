'use client';
import { DeliveryStatus, STATUS_ORDER, STATUS_LABELS } from '@/lib/types';

export default function ProgressBar({ status }: { status: DeliveryStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="w-full px-2 py-4">
      <div className="flex items-start justify-between relative">
        {/* Connecting lines behind circles */}
        <div className="absolute top-4 left-0 right-0 flex items-center px-4" aria-hidden="true">
          {STATUS_ORDER.map((_, i) => {
            if (i === STATUS_ORDER.length - 1) return null;
            const isCompleted = i < currentIndex;
            return (
              <div
                key={i}
                className={`h-0.5 flex-1 transition-colors duration-300 ${
                  isCompleted ? 'bg-[#F2FF66]' : 'bg-gray-700'
                }`}
              />
            );
          })}
        </div>

        {/* Steps */}
        {STATUS_ORDER.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={step} className="flex flex-col items-center flex-1 relative z-10">
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#F2FF66] border-[#F2FF66]'
                    : isCurrent
                    ? 'bg-transparent border-[#F2FF66] ring-2 ring-[#F2FF66]/30'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F2FF66]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-center text-xs leading-tight max-w-[56px] transition-colors duration-300 ${
                  isCompleted
                    ? 'text-[#F2FF66]'
                    : isCurrent
                    ? 'text-white font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
