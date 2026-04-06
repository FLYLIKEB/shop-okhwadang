'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const ANNOUNCEMENTS = [
  { id: 1, label: '옥화당 핸드메이드 차茶', href: '/collection' },
  { id: 2, label: '자사호 · 보이차 · 다구', href: '/products?isFeatured=true' },
  { id: 3, label: '신상품 입고', href: '/products?sort=latest' },
];

export default function AnnouncementBar() {
  const params = useParams();
  const locale = params.locale as string;
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDotClick = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveIndex(index);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4000);
  };

  return (
    <div className="bg-primary border-b border-border">
      <div className="md:flex md:items-center md:justify-between px-4 md:px-20">
        <div className="md:hidden relative overflow-hidden h-9">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {ANNOUNCEMENTS.map((item) => (
              <Link
                key={item.id}
                href={`/${locale}${item.href}`}
                className="flex items-center justify-center w-full shrink-0 py-2 text-sm text-center text-primary-foreground hover:opacity-70 transition-opacity"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5">
            {ANNOUNCEMENTS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDotClick(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'bg-primary-foreground w-4'
                    : 'bg-primary-foreground/40'
                }`}
                aria-label={`${i + 1}번 공지사항으로 이동`}
              />
            ))}
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-between">
          {ANNOUNCEMENTS.map((item) => (
            <Link
              key={item.id}
              href={`/${locale}${item.href}`}
              className="flex items-center py-2 px-4 text-sm text-primary-foreground hover:opacity-70 transition-opacity"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
