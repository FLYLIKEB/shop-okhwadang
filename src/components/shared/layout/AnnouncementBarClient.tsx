'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AnnouncementBarItem } from '@/lib/api-server';

interface AnnouncementBarClientProps {
  locale: string;
  items: AnnouncementBarItem[];
}

function resolveHref(locale: string, href: string | null): string | null {
  if (!href || href.trim().length === 0) return null;
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:)/.test(trimmed)) return trimmed;
  if (trimmed.startsWith(`/${locale}`)) return trimmed;
  if (trimmed.startsWith('/')) return `/${locale}${trimmed}`;
  return `/${locale}/${trimmed}`;
}

export default function AnnouncementBarClient({ locale, items }: AnnouncementBarClientProps) {
  const t = useTranslations('announcementBar');
  const [currentIndex, setCurrentIndex] = useState(0);

  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, href: resolveHref(locale, item.href) })),
    [items, locale],
  );

  useEffect(() => {
    if (normalizedItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % normalizedItems.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [normalizedItems.length]);

  if (normalizedItems.length === 0) {
    return <div data-testid="announcement-bar-empty" className="h-0 overflow-hidden" />;
  }

  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + normalizedItems.length) % normalizedItems.length);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % normalizedItems.length);

  return (
    <div
      className="relative flex items-center justify-center px-4 text-white md:justify-between"
      style={{ height: '37px', backgroundColor: '#000000', paddingLeft: '15px', paddingRight: '15px' }}
    >
      <div className="hidden md:block" />

      <div className="relative overflow-hidden" style={{ maxWidth: '360px', width: '100%' }}>
        <div
          className="transition-transform ease-out"
          data-testid="announcement-track"
          style={{ transform: `translateY(-${currentIndex * 100}%)`, transitionDuration: '500ms' }}
        >
          {normalizedItems.map((item) => {
            const content = (
              <span
                className="block text-center"
                style={{ fontWeight: 300, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: '14px', height: '37px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {item.message}
              </span>
            );

            if (!item.href) {
              return <div key={item.id}>{content}</div>;
            }

            return (
              <Link key={item.id} href={item.href} className="block text-white hover:text-white/80">
                {content}
              </Link>
            );
          })}
        </div>

        {normalizedItems.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={t('prev')}
              onClick={goPrev}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-transparent text-white opacity-75 transition-all hover:opacity-100 hover:text-[#757575]"
              style={{ width: '20px', height: '20px' }}
            >
              <ChevronLeft className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('next')}
              onClick={goNext}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-transparent text-white opacity-75 transition-all hover:opacity-100 hover:text-[#757575]"
              style={{ width: '20px', height: '20px' }}
            >
              <ChevronRight className="mx-auto h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="hidden md:block" />
    </div>
  );
}
