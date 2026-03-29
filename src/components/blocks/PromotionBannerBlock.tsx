'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { PromotionBannerContent } from '@/lib/api';

interface Props {
  content: PromotionBannerContent;
}

export default function PromotionBannerBlock({ content }: Props) {
  const { title, subtitle, image_url, cta_text, cta_url, template, end_date } = content;

  if (template === 'timer') {
    return (
      <section className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 p-8 text-center text-white">
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-purple-100">{subtitle}</p>}
        {end_date && <CountdownTimer endDate={end_date} />}
        {cta_text && cta_url && (
          <Link
            href={cta_url}
            className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-purple-600 hover:bg-purple-50"
          >
            {cta_text}
          </Link>
        )}
      </section>
    );
  }

  if (template === 'card') {
    return (
      <section className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {image_url && (
          <div className="relative hidden w-48 md:block">
            <Image src={image_url} alt={title} fill className="object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center p-6">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={cta_url}
              className="mt-3 inline-block w-fit rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {cta_text}
            </Link>
          )}
        </div>
      </section>
    );
  }

  // Default: full-width
  return (
    <section className="relative overflow-hidden rounded-xl bg-gray-900 p-8 text-white md:p-12">
      {image_url && (
        <Image src={image_url} alt={title} fill className="object-cover opacity-40" />
      )}
      <div className="relative z-10 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-gray-300">{subtitle}</p>}
        {cta_text && cta_url && (
          <Link
            href={cta_url}
            className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-gray-100"
          >
            {cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [remaining, setRemaining] = useState(calcRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (remaining.total <= 0) {
    return <p className="mt-2 text-sm text-purple-200">이벤트가 종료되었습니다</p>;
  }

  return (
    <div className="mt-3 flex justify-center gap-3" role="timer">
      <TimeUnit value={remaining.days} label="일" />
      <TimeUnit value={remaining.hours} label="시간" />
      <TimeUnit value={remaining.minutes} label="분" />
      <TimeUnit value={remaining.seconds} label="초" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="text-xs text-purple-200">{label}</span>
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
