'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const { locale } = useParams<{ locale?: string }>();
  const isEn = locale === 'en';
  const t = useTranslations('ui');
  const tCommon = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <h2 className="text-xl font-semibold uppercase text-foreground">
        {t('productNotFoundTitle')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('productNotFoundDescription')}
      </p>
      <Link href={isEn ? '/en' : '/'} className="text-sm uppercase text-primary underline-offset-4 hover:underline">
        {tCommon('home')}
      </Link>
    </div>
  );
}
