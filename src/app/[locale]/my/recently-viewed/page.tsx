'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/utils/currency';
import { getClientLocale } from '@/utils/clientLocale';
import { AccountPageHeader } from '@/components/shared/account/AccountPageHeader';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';
import { Button } from '@/components/ui/button';

interface RecentlyViewedProductImageProps {
  thumbnail: string | null;
  name: string;
}

function RecentlyViewedProductImage({ thumbnail, name }: RecentlyViewedProductImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div data-testid="recently-viewed-product-image-frame" className="relative aspect-square overflow-hidden bg-muted">
      {thumbnail && !hasImageError ? (
        <Image
          src={thumbnail}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="object-cover transition-transform group-hover:scale-105"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div data-testid="recently-viewed-product-image-fallback" className="flex h-full w-full items-center justify-center bg-neutral-200">
          <Image
            src="/logo-okhwadang.png"
            alt="옥화당"
            width={120}
            height={34}
            className="object-contain opacity-70 grayscale"
          />
        </div>
      )}
    </div>
  );
}

export default function RecentlyViewedPage() {
  const t = useTranslations('recentlyViewed');
  const locale = getClientLocale();
  const { items, clear } = useRecentlyViewed();

  const handleClear = () => {
    clear();
    toast.success(t('clearSuccess'));
  };

  return (
    <AccountPageShell maxWidth="max-w-4xl">
      <AccountPageHeader
        title={t('title')}
        action={items.length > 0 ? (
          <Button
            variant="gray"
            onClick={handleClear}
          >
            {t('clearAll')}
          </Button>
        ) : undefined}
      />

      {items.length === 0 ? (
        <EmptyState title={t('noItems')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <RecentlyViewedProductImage thumbnail={item.thumbnail} name={item.name} />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(item.salePrice ?? item.price, locale)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AccountPageShell>
  );
}
