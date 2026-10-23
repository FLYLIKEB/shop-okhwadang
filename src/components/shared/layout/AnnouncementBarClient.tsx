'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AnnouncementBarItem } from '@/lib/api-server';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

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
  const rowHeight = normalizedItems.length > 1 || normalizedItems.some((item) => item.href) ? 'h-11' : 'h-8';

  return (
    <div
      className={cn('relative flex items-center justify-center bg-black px-3 text-white md:px-5', rowHeight)}
    >
      <div className="hidden flex-1 md:block" />

      <div className={cn('relative w-full max-w-lg overflow-hidden', rowHeight)}>
        <div
          className={cn('transition-transform ease-out motion-reduce:transition-none', rowHeight)}
          data-testid="announcement-track"
          aria-live="polite"
          style={{ transform: `translateY(-${currentIndex * 100}%)`, transitionDuration: '500ms' }}
        >
          {normalizedItems.map((item) => {
            const content = (
              <span
                className={cn('flex items-center justify-center px-10 text-center typo-label font-normal tracking-wide', rowHeight)}
              >
                {item.message}
              </span>
            );

            if (!item.href) {
              return <div key={item.id}>{content}</div>;
            }

            return (
              <Link key={item.id} href={item.href} className="block text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-white">
                {content}
              </Link>
            );
          })}
        </div>

        {normalizedItems.length > 1 ? (
          <>
            <Button
              type="button"
              aria-label={t('prev')}
              onClick={goPrev}
              className="absolute left-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              aria-label={t('next')}
              onClick={goNext}
              className="absolute right-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>

      <div className="hidden flex-1 md:block" />
    </div>
  );
}
