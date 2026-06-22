'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import EmptyState from '@/components/shared/EmptyState';

export default function ProductErrorState() {
  const router = useRouter();
  const t = useTranslations('product');
  return (
    <EmptyState
      title={t('loadErrorTitle')}
      description={t('loadErrorDescription')}
      action={{ label: t('retry'), onClick: () => router.refresh() }}
    />
  );
}
