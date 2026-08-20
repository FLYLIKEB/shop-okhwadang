'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
import type { PromotionBannerContent } from '@/lib/api';
import { isSafeUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';

interface Props {
  content: PromotionBannerContent;
}

export default function PromotionBannerBlock({ content }: Props) {
  const { title, eyebrow, subtitle, image_url, cta_text, cta_url, template, end_date, expires_at, bgColor } = content;
  const countdownEndDate = end_date ?? expires_at;
  const { ref, visible } = useScrollAnimation<HTMLElement>();
  const t = useTranslations('promotion');

  if (template === 'timer') {
    return (
      <section className="py-16 md:py-24 border-y border-divider-soft text-center">
        <p className="text-sm tracking-widest text-primary uppercase mb-3">{t('limitedTime')}</p>
        <h2 className="text-2xl font-display font-medium">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        {countdownEndDate && <CountdownTimer endDate={countdownEndDate} />}
        {cta_text && cta_url && (
          <Button asChild variant="black" size="lg" className="mt-6">
            <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>{cta_text}</Link>
          </Button>
        )}
      </section>
    );
  }

  if (template === 'full') {
    const backgroundClass = bgColor === 'muted' ? 'bg-muted' : bgColor === 'foreground' ? 'bg-foreground text-background' : 'bg-background';
    const eyebrowClass = bgColor === 'foreground' ? 'text-background/70' : 'text-muted-foreground';
    const titleClass = bgColor === 'foreground' ? 'text-background' : 'text-foreground';
    const ctaVariant = bgColor === 'foreground' ? 'gray' : 'black';

    return (
      <section className={`py-16 px-4 text-center ${backgroundClass}`}>
        <p className={`text-xs font-semibold tracking-widest uppercase mb-3 ${eyebrowClass}`}>
          {eyebrow ?? t('specialOffer')}
        </p>
        <h2 className={`font-display typo-h2 mb-4 ${titleClass}`}>
          {title}
        </h2>
        {subtitle && <p className={`mb-6 text-sm ${eyebrowClass}`}>{subtitle}</p>}
        {cta_text && cta_url && (
          <Button asChild variant={ctaVariant} size="lg">
            <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>{cta_text}</Link>
          </Button>
        )}
      </section>
    );
  }

  if (template === 'card') {
    return (
      <section className="flex overflow-hidden border border-divider-soft">
        {image_url && (
          <div className="relative hidden w-48 md:block bg-muted">
            <Image src={image_url} alt={title} fill className="object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center p-6">
          <h2 className="text-lg font-medium">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          {cta_text && cta_url && (
            <Button asChild variant="gray" size="sm" className="mt-4">
              <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>{cta_text}</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative overflow-hidden py-16 md:py-24 border-t border-b border-divider-soft">
      {image_url && (
        <Image src={image_url} alt={title} fill className="object-cover opacity-20" />
      )}
      <div className="relative z-10 text-center px-8">
        <p
          className={`text-sm tracking-widest text-primary uppercase mb-3 transition-all duration-600 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {t('specialOffer')}
        </p>
        <h2
          className={`text-2xl font-display font-medium mb-2 transition-all duration-600 ease-out ${
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
          <Button
            asChild
            variant="black"
            size="lg"
            className={`transition-all duration-600 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ transitionDelay: visible ? '300ms' : undefined }}
          >
            <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>{cta_text}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const t = useTranslations('promotion');
  const [remaining, setRemaining] = useState(createInitialRemaining);

  useEffect(() => {
    setRemaining(calcRemaining(endDate));
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

function createInitialRemaining() {
  return { total: 1, days: 0, hours: 0, minutes: 0, seconds: 0 };
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
