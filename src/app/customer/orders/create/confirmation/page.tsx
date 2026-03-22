'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order_number') ?? '';
  const countStr = searchParams.get('count') ?? '1';
  const count = parseInt(countStr, 10) || 1;
  const isSingle = count === 1;

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareText = isSingle
    ? `Track my BlackBox delivery (Order ${orderNumber}): ${siteUrl}/customer/orders`
    : `I placed ${count} deliveries with BlackBox Logistics (Order ${orderNumber}). Track at: ${siteUrl}/customer/orders`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Success icon */}
        <div
          className="w-24 h-24 rounded-full bg-[#1e5030]/20 flex items-center justify-center mb-6"
          style={{ animation: 'scaleIn 0.4s ease-out' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 text-[#3d8050]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Order number */}
        {orderNumber && (
          <div className="bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-2xl px-6 py-5 mb-6 text-center w-full max-w-sm">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
              Order Number
            </p>
            <p className="text-[#F2FF66] text-2xl font-bold font-mono tracking-wider">
              {orderNumber}
            </p>
          </div>
        )}

        {/* Message */}
        {isSingle ? (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">Your order has been placed</h1>
            <p className="text-[#a1a4a5] text-sm mb-6 text-center">
              Your delivery is being processed under order{' '}
              <span className="text-[#f0f0f0] font-mono">{orderNumber}</span>. You can track it
              from your orders list.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">
              {count} deliveries placed successfully
            </h1>
            <p className="text-[#a1a4a5] text-sm mb-6 text-center">
              {count} deliveries created under order{' '}
              <span className="text-[#f0f0f0] font-mono">{orderNumber}</span>. View them in your
              orders list.
            </p>
          </>
        )}

        {/* WhatsApp share */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-sm flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share on WhatsApp
        </a>

        {/* Action buttons */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <Link
            href="/customer/orders"
            className="w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-sm bg-[#F2FF66] text-[#000000] hover:bg-[#e8f550] transition-colors"
          >
            View Orders
          </Link>

          <Link
            href="/customer/orders/create"
            className="w-full flex items-center justify-center py-3.5 rounded-xl text-sm text-[#a1a4a5] hover:text-[#F2FF66] transition-colors"
          >
            Create Another Order
          </Link>
        </div>
      </main>

      <style jsx>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#000000] flex items-center justify-center">
          <span className="text-[#a1a4a5] text-sm">Loading…</span>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
