'use client';
import Link from 'next/link';
import Logo from './Logo';

interface NavbarProps {
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

export default function Navbar({ showBack = false, backHref = '/', title }: NavbarProps) {
  return (
    <nav className="w-full bg-[#191314] border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
      {showBack && (
        <Link
          href={backHref}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-white flex-shrink-0"
          aria-label="Go back"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
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
