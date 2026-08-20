'use client';

import { memo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import ProductRatingSummary from '@/components/shared/products/ProductRatingSummary';
import ProductImageFrame from '@/components/shared/products/ProductImageFrame';
import { useCart } from '@/contexts/CartContext';
import { compactProductSummary } from '@/lib/collectionDisplay';
import type { Locale } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import { normalizeClayKey, type ClayKey } from '@/utils/clayTaxonomy';

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
  isFreeShipping?: boolean;
}

const CLAY_TAG_CLASS_BY_KEY: Record<ClayKey, string> = {
  zuni: 'tag-zuni',
  danni: 'tag-danni',
  zini: 'tag-zini',
  heukni: 'tag-heukni',
  chunsuni: 'tag-chunsuni',
  nokni: 'tag-nokni',
};

function getClayTagClass(categoryName: string): string | null {
  const clayKey = normalizeClayKey(categoryName);
  return clayKey ? CLAY_TAG_CLASS_BY_KEY[clayKey] : null;
}

function ProductCard({
  id,
  name,
  price,
  salePrice,
  shortDescription,
  rating,
  reviewCount,
  status,
  images,
  locale = 'ko',
  priority = false,
  categoryName,
  isFreeShipping = false,
}: ProductCardProps) {
  const t = useTranslations('product');
  const tHeader = useTranslations('header');
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;
  const isSoldout = status === 'soldout';
  const clayTagClass = categoryName ? getClayTagClass(categoryName) : null;
  const productHref = `/products/${id}`;

  const { addItem } = useCart();
  const [isCartLoading, setIsCartLoading] = useState(false);

  const handleAddToCart = async () => {
    setIsCartLoading(true);
    try {
      await addItem({ productId: id, productOptionId: null, quantity: 1 });
    } finally {
      setIsCartLoading(false);
    }
  };

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl bg-card p-2 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm',
        isSoldout && 'opacity-60',
      )}
    >
      {/* ── 이미지 영역 — 오버레이 액션은 hover 시에만 노출 ── */}
      <ProductImageFrame
        imageUrl={thumbnail}
        alt={name}
        href={productHref}
        locale={locale}
        frameTestId="product-card-image-frame"
        fallbackTestId="product-card-image-fallback"
        frameClassName="aspect-square overflow-hidden rounded-xl bg-muted"
        imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        priority={priority}
        fallbackLogoAlt={tHeader('okhwadang')}
        fallbackLogoWidth={120}
        fallbackLogoHeight={34}
      >
        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
            <span className="typo-label font-semibold tracking-widest text-foreground">{t('stockStatus.soldout')}</span>
          </div>
        )}

        {categoryName && (
          <span
            className={cn(
              'absolute bottom-2 left-2 z-10 px-2 py-0.5 tag-clay shadow-sm pointer-events-none',
              clayTagClass ?? 'tag-generic',
            )}
          >
            {categoryName}
          </span>
        )}

        {isFreeShipping && (
          <span className="tag-clay absolute bottom-2 right-2 z-10 bg-foreground/85 px-2 py-0.5 text-background shadow-sm backdrop-blur-sm pointer-events-none">
            {t('badgeFreeShipping')}
          </span>
        )}

        {!isSoldout && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAddToCart}
            disabled={isCartLoading}
            className="absolute right-2 top-2 z-10 hidden h-9 min-h-9 w-9 cursor-pointer rounded-full bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-colors transition-opacity hover:bg-background md:inline-flex md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          >
            <ShoppingCart className="h-4 w-4 text-foreground" />
            <span className="sr-only">
              {isCartLoading ? t('addingToCart') : t('addToCart')}
            </span>
          </Button>
        )}
      </ProductImageFrame>

      {/* ── 정보 영역 — 상품명 > 가격 > 메타 위계 ── */}
      <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="product-card__title min-w-0 typo-body-sm font-semibold line-clamp-3 break-words leading-snug text-foreground">{name}</p>
          <ProductRatingSummary rating={rating} reviewCount={reviewCount} />
        </div>

        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        <div className="mt-0.5 flex flex-col gap-1">
          {shortDescription && (
            <p className="line-clamp-1 typo-label leading-relaxed text-muted-foreground">
              {compactProductSummary(shortDescription)}
            </p>
          )}
        </div>

        {isSoldout && (
          <p className="mt-auto rounded-full bg-destructive/10 px-3 py-2 text-center typo-label font-medium text-destructive">
            {t('stockStatus.soldoutReason')}
          </p>
        )}

      </div>
    </article>
  );
}

export default memo(ProductCard);
