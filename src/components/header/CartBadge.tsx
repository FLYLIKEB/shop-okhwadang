'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';

interface CartBadgeProps {
  itemCount: number;
  className?: string;
  iconSize?: string;
}

export function CartBadge({ itemCount, className, iconSize = 'h-5 w-5' }: CartBadgeProps) {
  const t = useTranslations('header');
  return (
    <Link href="/cart" aria-label={t('cartLabel')} className={cn('relative', className)}>
      <ShoppingCart className={cn(iconSize, 'text-muted-foreground hover:text-foreground transition-colors')} />
      {itemCount > 0 && (
        <span
          role="status"
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold leading-none"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
