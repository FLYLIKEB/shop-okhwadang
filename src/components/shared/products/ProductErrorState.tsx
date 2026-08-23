'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/shared/StateFeedback';

export default function ProductErrorState() {
  const router = useRouter();
  const t = useTranslations('product');
  return (
    <StateFeedback
      variant="storefront"
      tone="error"
      title={t('loadErrorTitle')}
      description={t('loadErrorDescription')}
      action={
        <Button variant="black" onClick={() => router.refresh()}>
          {t('retry')}
        </Button>
      }
    />
  );
}
