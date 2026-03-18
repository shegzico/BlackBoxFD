'use client';
import Link from 'next/link';

export default function Logo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small: 'text-lg',
    default: 'text-2xl',
    large: 'text-4xl',
  };
  return (
    <Link href="/" className={`font-bold tracking-wider ${sizes[size]}`}>
      <span className="text-[#F2FF66]">BLACK</span>
      <span className="text-white">BOX</span>
    </Link>
  );
}
