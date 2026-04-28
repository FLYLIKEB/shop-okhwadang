'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { promotionsApi } from '@/lib/api';
import type { Promotion } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import CountdownTimer from '@/components/shared/home/CountdownTimer';

const TYPE_KEY_MAP: Record<Promotion['type'], string> = {
  timesale: 'types.timesale',
  exhibition: 'types.exhibition',
  event: 'types.event',
};

const TYPE_ORDER: Promotion['type'][] = ['timesale', 'exhibition', 'event'];

const DATE_LOCALE_MAP: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
};

export default function EventPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('event');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const dateLocale = DATE_LOCALE_MAP[locale] ?? locale;

  const { execute: loadPromotions, isLoading: loading } = useAsyncAction(
    async () => {
      const data = await promotionsApi.getList(locale);
      setPromotions(Array.isArray(data) ? data : []);
    },
    { errorMessage: t('errorLoad') },
  );

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        <EmptyState title={t('empty')} />
      </div>
    );
  }

  const grouped = TYPE_ORDER.reduce<Record<Promotion['type'], Promotion[]>>(
    (acc, type) => {
      acc[type] = promotions.filter((p) => p.type === type);
      return acc;
    },
    { timesale: [], exhibition: [], event: [] },
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t('title')}</h1>

      {TYPE_ORDER.map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        return (
          <section key={type} className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {type === 'timesale' && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded">
                  LIVE
                </span>
              )}
              {t(TYPE_KEY_MAP[type])}
            </h2>
            <ul className="space-y-4">
              {items.map((promo) => (
                <li key={promo.id}>
                  <Link
                    href={`/event/${promo.id}`}
                    className="flex gap-4 items-start p-4 border border-border rounded-xl hover:shadow-md transition-shadow bg-card"
                  >
                    {promo.imageUrl && (
                      <div className="shrink-0 w-24 h-24 relative rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={promo.imageUrl}
                          alt={promo.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{promo.title}</p>
                      {promo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {promo.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {promo.discountRate && (
                          <span className="text-red-500 font-bold">
                            {t('discount', { percent: promo.discountRate })}
                          </span>
                        )}
                        <span>
                          {t('until', {
                            date: new Date(promo.endsAt).toLocaleDateString(dateLocale),
                          })}
                        </span>
                        {type === 'timesale' && (
                          <span className="flex items-center gap-1">
                            {t('timeLeft')}: <CountdownTimer endsAt={promo.endsAt} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
