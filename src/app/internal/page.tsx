'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

const navCards = [
  {
    href: '/order',
    icon: '📦',
    title: 'Place Order',
    subtitle: 'Send a package anywhere in Lagos',
  },
  {
    href: '/track',
    icon: '🔍',
    title: 'Track Package',
    subtitle: 'Check your delivery status',
  },
  {
    href: '/bb-rider',
    icon: '🏍️',
    title: 'Rider Portal',
    subtitle: 'Access your rider dashboard',
  },
  {
    href: '/bb-admin',
    icon: '⚙️',
    title: 'Admin Login',
    subtitle: 'Manage operations',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
        <div className="mb-6">
          <Logo size="large" />
        </div>
        <p className="text-lg text-gray-400 max-w-xs leading-relaxed">
          Lagos&apos;s Premier Motorcycle Dispatch Service
        </p>
      </section>

      {/* Navigation Cards Grid */}
      <section className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="
                flex flex-col items-center justify-center text-center
                bg-[#070707] border border-[rgba(255,255,255,0.08)] rounded-xl
                p-5 gap-3
                active:scale-95
                hover:border-[#212629] hover:bg-[#1f1a1c]
                transition-all duration-150
                min-h-[140px]
              "
            >
              <span className="text-4xl leading-none" role="img" aria-label={card.title}>
                {card.icon}
              </span>
              <div>
                <p className="text-[#f0f0f0] font-semibold text-sm leading-snug">
                  {card.title}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-snug">
                  {card.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
