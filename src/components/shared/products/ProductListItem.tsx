import React from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import type { Locale } from '@/utils/currency';
import ProductRatingSummary from '@/components/shared/products/ProductRatingSummary';
import ProductImageFrame from '@/components/shared/products/ProductImageFrame';

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
  const tHeader = useTranslations('header');
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;
  const isSoldout = status === 'soldout';

  return (
    <Link
      href={`/products/${id}`}
      locale={locale}
      className={cn(
        'group flex gap-4 overflow-hidden rounded-2xl bg-card p-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md',
        isSoldout && 'opacity-75',
      )}
    >
      <ProductImageFrame
        imageUrl={thumbnail}
        alt={name}
        frameTestId="product-list-item-image-frame"
        fallbackTestId="product-list-item-image-fallback"
        frameClassName="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
        imageClassName="object-cover"
        sizes="96px"
        loading="lazy"
        fallbackLogoAlt={tHeader('okhwadang')}
        fallbackLogoWidth={72}
        fallbackLogoHeight={21}
      >
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <span className="typo-label font-semibold text-foreground">{t('stockStatus.soldout')}</span>
          </div>
        )}
      </ProductImageFrame>

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
