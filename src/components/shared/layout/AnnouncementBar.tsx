'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const ANNOUNCEMENTS = [
  { id: 1, label: '옥화당 핸드메이드 차茶', href: '/collection' },
  { id: 2, label: '다실 도자기 특가', href: '/products?isFeatured=true' },
  { id: 3, label: '신상품 입고', href: '/products?sort=latest' },
];

export default function AnnouncementBar() {
  const params = useParams();
  const locale = params.locale as string;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1A1815] border-b border-border/50 overflow-hidden">
      <div className="hidden md:flex mx-auto max-w-8xl items-center justify-between px-4 md:px-20">
        {ANNOUNCEMENTS.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex items-center py-2.5 px-6 text-sm transition-colors hover:text-[#D4BC8E] text-[#F5F3EF]/80"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="md:hidden relative">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {ANNOUNCEMENTS.map((item) => (
            <Link
              key={item.id}
              href={`/${locale}${item.href}`}
              className="min-w-full flex items-center justify-center py-2.5 px-6 text-sm transition-colors hover:text-[#D4BC8E] text-[#F5F3EF]/80"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}