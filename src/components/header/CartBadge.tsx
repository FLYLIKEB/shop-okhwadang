'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';

interface CartBadgeProps {
  itemCount: number;
  className?: string;
}

export function CartBadge({ itemCount, className }: CartBadgeProps) {
  const t = useTranslations('header');
  return (
    <Link
      href="/cart"
      aria-label={t('cartLabel')}
      className={cn('toss-header__cart inline-flex h-11 items-center justify-center px-2 typo-body-sm font-normal text-foreground transition-colors', className)}
    >
      <span>{t('cartText')} (<span role={itemCount > 0 ? 'status' : undefined}>{itemCount > 99 ? '99+' : itemCount}</span>)</span>
    </Link>
  );
}
