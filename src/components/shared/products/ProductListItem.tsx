import React from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import type { Locale } from '@/utils/currency';
import ProductRatingSummary from '@/components/shared/products/ProductRatingSummary';

interface ProductListItemProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  shortDescription?: string | null;
  rating?: number;
  reviewCount?: number;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
  isFreeShipping?: boolean;
  locale?: Locale;
}

function ProductListItem({
  id,
  name,
  price,
  salePrice,
  shortDescription,
  rating,
  reviewCount,
  status,
  images,
  isFreeShipping = false,
  locale = 'ko',
}: ProductListItemProps) {
  const t = useTranslations('product');
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;
  const isSoldout = status === 'soldout';
  const [hasImageError, setHasImageError] = React.useState(false);

  return (
    <Link
      href={`/products/${id}`}
      locale={locale}
      className={cn(
        'group flex gap-4 overflow-hidden rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md',
        isSoldout && 'opacity-75',
      )}
    >
      <div data-testid="product-list-item-image-frame" className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted">
        {thumbnail && !hasImageError ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
            loading="lazy"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div data-testid="product-list-item-image-fallback" className="flex h-full w-full items-center justify-center bg-neutral-200">
            <Image
              src="/logo-okhwadang.png"
              alt="옥화당"
              width={72}
              height={21}
              className="object-contain opacity-70 grayscale"
            />
          </div>
        )}
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-xs font-semibold text-white">{t('stockStatus.soldout')}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="product-list-item__title min-w-0 typo-title-sm font-body line-clamp-1 text-card-foreground">{name}</p>
          <ProductRatingSummary rating={rating} reviewCount={reviewCount} />
        </div>
        <div className="flex items-center gap-2">
          <PriceDisplay price={price} salePrice={salePrice} locale={locale} />
          {isFreeShipping && (
            <span className="tag-clay bg-foreground/85 px-2 py-0.5 text-background">
              {t('badgeFreeShipping')}
            </span>
          )}
        </div>
        {isSoldout && (
          <p className="line-clamp-1 typo-body-sm font-medium text-destructive">{t('stockStatus.soldoutReason')}</p>
        )}
        {!isSoldout && shortDescription && (
          <p className="line-clamp-1 typo-body-sm text-muted-foreground">{shortDescription}</p>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductListItem);
