'use client';

import { memo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import ProductRatingSummary from '@/components/shared/products/ProductRatingSummary';
import { useCart } from '@/contexts/CartContext';
import { compactProductSummary } from '@/lib/collectionDisplay';
import type { Locale } from '@/utils/currency';
import { Button } from '@/components/ui/button';

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

/** 카테고리명 → 니료 태그 CSS 클래스 매핑 */
const CLAY_TAG_MAP: Record<string, string> = {
  '주니': 'tag-zuni',
  '朱泥': 'tag-zuni',
  '단니': 'tag-danni',
  '段泥': 'tag-danni',
  '자니': 'tag-zini',
  '紫泥': 'tag-zini',
  '흑니': 'tag-heukni',
  '黑泥': 'tag-heukni',
  '청수니': 'tag-chunsuni',
  '靑水泥': 'tag-chunsuni',
  '녹니': 'tag-nokni',
  '綠泥': 'tag-nokni',
};

function getClayTagClass(categoryName: string): string | null {
  for (const [key, cls] of Object.entries(CLAY_TAG_MAP)) {
    if (categoryName.includes(key)) return cls;
  }
  return null;
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
  const thumbnailImage = images.find((image) => image.isThumbnail) ?? images[0];
  const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;
  const isSoldout = status === 'soldout';
  const clayTagClass = categoryName ? getClayTagClass(categoryName) : null;
  const productHref = `/products/${id}`;

  const { addItem } = useCart();
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

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
        'group flex h-full flex-col',
        isSoldout && 'opacity-60',
      )}
    >
      {/* ── 이미지 영역 — 오버레이 액션은 hover 시에만 노출 ── */}
      <div data-testid="product-card-image-frame" className="relative aspect-square overflow-hidden bg-secondary">
        <Link href={productHref} locale={locale} className="block h-full" aria-label={name}>
          {thumbnail && !hasImageError ? (
            <Image
              src={thumbnail}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={priority}
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div data-testid="product-card-image-fallback" className="flex h-full w-full items-center justify-center bg-neutral-200">
              <Image
                src="/logo-okhwadang.png"
                alt="옥화당"
                width={120}
                height={34}
                className="object-contain opacity-70 grayscale"
              />
            </div>
          )}
        </Link>

        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 pointer-events-none">
            <span className="data-label text-foreground tracking-widest">{t('stockStatus.soldout')}</span>
          </div>
        )}

        {categoryName && (
          <span
            className={cn(
              'absolute left-2 bottom-2 z-10 px-2 py-0.5 tag-clay pointer-events-none',
              clayTagClass ?? 'tag-generic',
            )}
          >
            {categoryName}
          </span>
        )}

        {isFreeShipping && (
          <span className="tag-clay absolute bottom-2 right-2 z-10 bg-foreground/85 px-2 py-0.5 text-background backdrop-blur-sm pointer-events-none">
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
            className="absolute right-2 top-2 z-10 h-8 min-h-8 w-8 cursor-pointer rounded-full bg-transparent opacity-100 transition-colors transition-opacity hover:bg-background/90 md:opacity-0 md:group-hover:opacity-100 md:group-hover:bg-background/60 md:group-focus-within:opacity-100"
          >
            <ShoppingCart className="h-4 w-4 text-white mix-blend-difference" />
            <span className="sr-only">
              {isCartLoading ? t('addingToCart') : t('addToCart')}
            </span>
          </Button>
        )}
      </div>

      {/* ── 정보 영역 — 상품명 > 가격 > 메타 위계 ── */}
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 typo-title line-clamp-3 break-words leading-snug text-foreground">{name}</p>
          <ProductRatingSummary rating={rating} reviewCount={reviewCount} />
        </div>

        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        <div className="mt-0.5 flex flex-col gap-1">
          {shortDescription && (
            <p className="line-clamp-1 text-xs text-muted-foreground leading-relaxed">
              {compactProductSummary(shortDescription)}
            </p>
          )}
        </div>

        {isSoldout && (
          <p className="mt-auto rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
            {t('stockStatus.soldoutReason')}
          </p>
        )}

      </div>
    </article>
  );
}

export default memo(ProductCard);
