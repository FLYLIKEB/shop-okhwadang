'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function PopupsError({ reset }: { reset: () => void }) {
  const t = useTranslations('popups');
  return <div role="alert" className="space-y-4"><p>{t('fetchError')}</p><Button onClick={reset}>{t('retry')}</Button></div>;
}
