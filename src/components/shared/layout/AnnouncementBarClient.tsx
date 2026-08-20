'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AnnouncementBarItem } from '@/lib/api-server';
import { Button } from '@/components/ui/button';

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
      className="relative flex min-h-11 items-center justify-center border-b border-soft bg-muted/80 px-3 text-foreground md:px-5"
    >
      <div className="hidden flex-1 md:block" />

      <div className="relative w-full max-w-lg overflow-hidden">
        <div
          className="transition-transform ease-out"
          data-testid="announcement-track"
          aria-live="polite"
          style={{ transform: `translateY(-${currentIndex * 100}%)`, transitionDuration: '500ms' }}
        >
          {normalizedItems.map((item) => {
            const content = (
              <span
                className="flex h-11 items-center justify-center px-10 text-center typo-body-sm font-medium"
              >
                {item.message}
              </span>
            );

            if (!item.href) {
              return <div key={item.id}>{content}</div>;
            }

            return (
              <Link key={item.id} href={item.href} className="block text-foreground transition-colors hover:text-primary">
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
              className="absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2"
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              aria-label={t('next')}
              onClick={goNext}
              className="absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2"
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
