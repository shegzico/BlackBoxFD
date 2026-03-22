'use client';
import Link from 'next/link';
import Logo from './Logo';
import { ArrowLeft2 } from 'iconsax-react';

interface NavbarProps {
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

export default function Navbar({ showBack = false, backHref = '/', title }: NavbarProps) {
  return (
    <nav className="w-full bg-[#070707] border-b border-[rgba(255,255,255,0.08)] px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
      {showBack && (
        <Link
          href={backHref}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#161616] hover:bg-gray-700 transition-colors text-white flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft2 size={16} color="currentColor" />
        </Link>
      )}

      <div className="flex-1 flex items-center gap-3">
        {!showBack && <Logo size="default" />}

        {title && (
          <span className="text-white font-semibold text-base truncate">
            {title}
          </span>
        )}
      </div>
    </nav>
  );
}
