'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import type { ProductAttribute, ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import ProductImageFrame from '@/components/shared/products/ProductImageFrame';
import { useCart } from '@/contexts/CartContext';
import { compactProductSummary } from '@/lib/collectionDisplay';
import type { Locale } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  shortDescription?: string | null;
  rating?: number;
  reviewCount?: number;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  locale?: Locale;
  priority?: boolean;
  categoryName?: string | null;
  attributes?: ProductAttribute[];
  isFreeShipping?: boolean;
}

function ProductCard({
  id,
  name,
  price,
  salePrice,
  shortDescription,
  reviewCount,
  status,
  images,
  locale = 'ko',
  priority = false,
  categoryName,
  attributes,
  isFreeShipping = false,
}: ProductCardProps) {
  const t = useTranslations('product');
  const tHeader = useTranslations('header');
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;
  const isSoldout = status === 'soldout';
  const productHref = `/products/${id}`;

  const { addItem } = useCart();
  const { execute: handleAddToCart, isLoading: isCartLoading } = useAsyncAction(
    () => addItem({ productId: id, productOptionId: null, quantity: 1 }),
    { errorMessage: t('addToCartError') },
  );

  return (
    <article className="product-card flex h-full flex-col">
      <ProductImageFrame
        imageUrl={thumbnail}
        alt={name}
        href={productHref}
        locale={locale}
        frameTestId="product-card-image-frame"
        fallbackTestId="product-card-image-fallback"
        frameClassName="aspect-square overflow-hidden bg-muted"
        imageClassName="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        priority={priority}
        fallbackLogoAlt={tHeader('okhwadang')}
        fallbackLogoWidth={120}
        fallbackLogoHeight={34}
      >
        {(isSoldout || isFreeShipping) && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap justify-between gap-1 bg-background p-2 typo-label uppercase text-foreground">
            {isSoldout && <span>{t('stockStatus.soldout')}</span>}
            {isFreeShipping && <span className="ml-auto">{t('badgeFreeShipping')}</span>}
          </div>
        )}
        {attributes && attributes.length > 0 && (
          <span className="pointer-events-none absolute bottom-2 inset-x-2 text-right typo-label text-white">
            {[...attributes]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((attribute) => attribute.displayValue ?? attribute.value)
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </ProductImageFrame>

      <div className="flex flex-1 flex-col gap-1 px-1 pt-4 md:px-0">
        {categoryName && <p className="typo-label uppercase text-foreground">{categoryName}</p>}
        <p className="product-card__title min-w-0 typo-body-sm font-normal break-words leading-relaxed text-foreground">{name}</p>
        {shortDescription && (
          <p className="typo-label leading-relaxed text-muted-foreground">
            {compactProductSummary(shortDescription)}
          </p>
        )}
        <PriceDisplay price={price} salePrice={salePrice} locale={locale} className="mt-2" />
        {isSoldout && (
          <p className="typo-label text-muted-foreground">{t('stockStatus.soldoutReason')}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 pt-4">
          {reviewCount !== undefined && reviewCount > 0 && (
            <p className="typo-label uppercase text-muted-foreground">{t('cardReviewCount', { count: reviewCount })}</p>
          )}
          {!isSoldout && (
            <Button
              type="button"
              variant="link"
              onClick={() => handleAddToCart()}
              disabled={isCartLoading}
              aria-busy={isCartLoading}
              className="ml-auto px-0 typo-label font-normal uppercase text-foreground"
            >
              {isCartLoading ? t('addingToCart') : t('addToCart')}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);
