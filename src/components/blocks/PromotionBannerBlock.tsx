'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { PromotionBannerContent } from '@/lib/api';
import { isSafeUrl } from '@/utils/url';

interface Props {
  content: PromotionBannerContent;
}

export default function PromotionBannerBlock({ content }: Props) {
  const { title, subtitle, image_url, cta_text, cta_url, template, end_date } = content;
  const { ref, visible } = useScrollAnimation<HTMLElement>();
  const t = useTranslations('promotion');

  if (template === 'timer') {
    return (
      <section className="py-20 md:py-28 border-y border-border text-center">
        <p className="text-sm tracking-widest text-muted-foreground uppercase mb-3">{t('limitedTime')}</p>
        <h2 className="text-2xl font-medium">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        {end_date && <CountdownTimer endDate={end_date} />}
        {cta_text && cta_url && (
          <Link
            href={isSafeUrl(cta_url) ? cta_url : '#'}
            className="mt-6 inline-block border border-foreground px-8 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            {cta_text}
          </Link>
        )}
      </section>
    );
  }

  if (template === 'card') {
    return (
      <section className="flex overflow-hidden border border-border">
        {image_url && (
          <div className="relative hidden w-48 md:block bg-muted">
            <Image src={image_url} alt={title} fill className="object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="text-lg font-medium">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={isSafeUrl(cta_url) ? cta_url : '#'}
              className="mt-4 inline-block border border-foreground px-6 py-2 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              {cta_text}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative overflow-hidden py-20 md:py-28 border-t border-b border-border">
      {image_url && (
        <Image src={image_url} alt={title} fill className="object-cover opacity-20" />
      )}
      <div className="relative z-10 text-center px-8">
        <p
          className={`text-sm tracking-widest text-muted-foreground uppercase mb-3 transition-all duration-600 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {t('specialOffer')}
        </p>
        <h2
          className={`text-2xl font-medium mb-2 transition-all duration-600 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: visible ? '100ms' : undefined }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`text-muted-foreground text-sm mb-6 transition-all duration-600 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: visible ? '200ms' : undefined }}
          >
            {subtitle}
          </p>
        )}
        {cta_text && cta_url && (
          <Link
            href={isSafeUrl(cta_url) ? cta_url : '#'}
            className={`inline-block border border-foreground px-8 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors duration-600 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: visible ? '300ms' : undefined }}
          >
            {cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const t = useTranslations('promotion');
  const [remaining, setRemaining] = useState(calcRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (remaining.total <= 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{t('eventEnded')}</p>;
  }

  return (
    <div className="mt-4 flex justify-center gap-6" role="timer">
      <TimeUnit value={remaining.days} label={t('days')} />
      <TimeUnit value={remaining.hours} label={t('hours')} />
      <TimeUnit value={remaining.minutes} label={t('minutes')} />
      <TimeUnit value={remaining.seconds} label={t('seconds')} />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-medium tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function calcRemaining(endDate: string) {
  const total = new Date(endDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
