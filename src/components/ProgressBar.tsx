'use client';
import { DeliveryStatus, STATUS_ORDER, RETURN_STATUS_ORDER, STATUS_LABELS } from '@/lib/types';
import { TickCircle, CloseCircle } from 'iconsax-react';

const RETURN_STATUSES = new Set<DeliveryStatus>(['delivery_failed', 'returning', 'returned']);

function StepBar({
  steps,
  currentStatus,
  isReturn,
}: {
  steps: DeliveryStatus[];
  currentStatus: DeliveryStatus;
  isReturn: boolean;
}) {
  const currentIndex = steps.indexOf(currentStatus);
  const activeColor = isReturn ? '#6080c0' : '#F2FF66';
  const activeBg = isReturn ? 'bg-[#6080c0]' : 'bg-[#F2FF66]';
  const activeBorder = isReturn ? 'border-[#6080c0]' : 'border-[#F2FF66]';
  const activeRing = isReturn ? 'ring-[#6080c0]/30' : 'ring-[#F2FF66]/30';
  const activeTextCompleted = isReturn ? 'text-[#6080c0]' : 'text-[#F2FF66]';

  return (
    <div className="w-full px-2 py-4">
      <div className="flex items-start justify-between relative">
        {/* Connecting lines */}
        <div className="absolute top-4 left-0 right-0 flex items-center px-4" aria-hidden="true">
          {steps.map((_, i) => {
            if (i === steps.length - 1) return null;
            return (
              <div
                key={i}
                className={`h-0.5 flex-1 transition-colors duration-300 ${i < currentIndex ? activeBg : 'bg-gray-700'}`}
              />
            );
          })}
        </div>

        {/* Steps */}
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center flex-1 relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? `${activeBg} ${activeBorder}`
                    : isCurrent
                    ? `bg-transparent ${activeBorder} ring-2 ${activeRing}`
                    : 'bg-[#161616] border-[rgba(255,255,255,0.06)]'
                }`}
              >
                {isCompleted ? (
                  <TickCircle size={16} color={isReturn ? '#ffffff' : 'currentColor'} variant="Bold" />
                ) : isCurrent ? (
                  <div className={`w-2.5 h-2.5 rounded-full ${activeBg}`} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
              </div>

              <span
                className={`mt-2 text-center text-xs leading-tight max-w-[56px] transition-colors duration-300 ${
                  isCompleted
                    ? activeTextCompleted
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

export default function ProgressBar({ status }: { status: DeliveryStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="w-full px-3 py-4 flex items-center gap-2.5">
        <CloseCircle size={18} color="#a85858" variant="Bold" />
        <span className="text-[#a85858] text-sm font-medium">Delivery Cancelled</span>
      </div>
    );
  }

  if (RETURN_STATUSES.has(status)) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-[#6080c0] uppercase tracking-wider font-medium px-2 pt-2">Return Flow</p>
        <StepBar steps={RETURN_STATUS_ORDER} currentStatus={status} isReturn={true} />
      </div>
    );
  }

  return <StepBar steps={STATUS_ORDER} currentStatus={status} isReturn={false} />;
}
