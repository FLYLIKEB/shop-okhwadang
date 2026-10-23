import React from 'react';
import PreOrderNotice from '@/components/shared/products/PreOrderNotice';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import type { Locale } from '@/utils/currency';
import ProductImageFrame from '@/components/shared/products/ProductImageFrame';

interface ProductListItemProps {
  id: number;
  name: string;
  price: number;
  priceUsd?: number | null;
  salePriceUsd?: number | null;
  pricingKrwPerUsd?: number | null;
  salePrice: number | null;
  shortDescription?: string | null;
  rating?: number;
  reviewCount?: number;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
  isFreeShipping?: boolean;
  isPreOrder?: boolean;
  preOrderShippingDate?: string | null;

  locale?: Locale;
}

function ProductListItem({
  id,
  name,
  price,
  salePrice,
  priceUsd, salePriceUsd, pricingKrwPerUsd,
  shortDescription,
  rating,
  reviewCount,
  status,
  images,
  isFreeShipping = false,
  isPreOrder,
  preOrderShippingDate,
  locale = 'ko',
}: ProductListItemProps) {
  const t = useTranslations('product');
  const tHeader = useTranslations('header');
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.url ?? thumbnailImage?.thumbnailUrl;
  const isSoldout = status === 'soldout';

  return (
    <Link
      href={`/products/${id}`}
      locale={locale}
      className="product-list-item block text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ProductImageFrame
        imageUrl={thumbnail}
        hoverImageUrl={[...images].filter((image) => !image.isDescriptionImage).sort((a, b) => a.sortOrder - b.sortOrder)[1]?.url}
        alt={name}
        frameTestId="product-list-item-image-frame"
        fallbackTestId="product-list-item-image-fallback"
        frameClassName="aspect-square w-full bg-muted"
        imageClassName="object-cover"
        sizes="100vw"
        loading="lazy"
        fallbackLogoAlt={tHeader('okhwadang')}
        fallbackLogoWidth={72}
        fallbackLogoHeight={21}
      >
        {isFreeShipping && (
          <span className="pointer-events-none absolute right-2 top-2 typo-label text-white">
            {t('badgeFreeShipping')}
          </span>
        )}
        {isSoldout && (
          <div className="absolute left-0 top-0 p-2 text-foreground bg-background">
            <span className="typo-label font-normal text-foreground">{t('stockStatus.soldout')}</span>
          </div>
        )}
      </ProductImageFrame>

      <div className="flex flex-col gap-1 px-2 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="product-list-item__title min-w-0 typo-body-sm font-normal break-words text-foreground">{name}</p>
          {rating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
            <span className="typo-label text-muted-foreground">
              {t('ratingSummary', { rating: rating.toFixed(1), count: reviewCount })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <PriceDisplay priceUsd={priceUsd} salePriceUsd={salePriceUsd} pricingKrwPerUsd={pricingKrwPerUsd} price={price} salePrice={salePrice} locale={locale} />
        </div>
        <PreOrderNotice isPreOrder={isPreOrder} preOrderShippingDate={preOrderShippingDate} />
        {isSoldout && (
          <p className="typo-label text-muted-foreground">{t('stockStatus.soldoutReason')}</p>
        )}
        {!isSoldout && shortDescription && (
          <p className="typo-label text-muted-foreground">{shortDescription}</p>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductListItem);
