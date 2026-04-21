'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import StarRating from '@/components/shared/reviews/StarRating';
import { useWishlistToggle } from '@/components/shared/hooks/useWishlistToggle';
import { useCart } from '@/contexts/CartContext';
import type { Locale } from '@/utils/currency';

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
}: ProductCardProps) {
  const t = useTranslations('product');
  const tWishlist = useTranslations('wishlist');
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';
  const clayTagClass = categoryName ? getClayTagClass(categoryName) : null;
  const hasRating = rating !== undefined && reviewCount !== undefined && reviewCount > 0;

  const { addItem } = useCart();
  const { isWishlisted, loading: isWishlistLoading, toggle: handleToggleWishlist } = useWishlistToggle(id);
  const [isCartLoading, setIsCartLoading] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCartLoading(true);
    try {
      await addItem({ productId: id, productOptionId: null, quantity: 1 });
    } finally {
      setIsCartLoading(false);
    }
  };

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        'group flex flex-col h-full',
        isSoldout && 'opacity-60',
      )}
    >
      {/* ── 이미지 영역 — 오버레이 액션은 hover 시에만 노출 ── */}
      <div className="relative aspect-square overflow-hidden bg-secondary rounded-md">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="data-label">No Image</span>
          </div>
        )}

        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="data-label text-foreground tracking-widest">SOLD OUT</span>
          </div>
        )}

        {categoryName && (
          <span
            className={cn(
              'absolute left-2 bottom-2 z-10 px-2 py-0.5 rounded-sm tag-clay',
              clayTagClass ?? 'tag-generic',
            )}
          >
            {categoryName}
          </span>
        )}

        {/* 찜하기 — 모바일: 항상 노출 / 데스크톱: hover 또는 찜한 상태에서만 */}
        <button
          type="button"
          aria-label={isWishlisted ? tWishlist('toggleOff') : tWishlist('toggleOn')}
          onClick={(e) => {
            e.preventDefault();
            handleToggleWishlist(e);
          }}
          disabled={isWishlistLoading}
          className={cn(
            'absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full',
            'bg-background/70 backdrop-blur-sm transition-opacity hover:bg-background/90',
            'disabled:cursor-not-allowed',
            'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
            isWishlisted && 'md:opacity-100',
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isWishlisted ? 'fill-foreground text-foreground' : 'text-foreground/70',
            )}
          />
        </button>
      </div>

      {/* ── 정보 영역 — 상품명 > 가격 > 메타 위계 ── */}
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {/* 1순위: 상품명 */}
        <p className="typo-title line-clamp-2 text-foreground min-h-[2.75rem]">{name}</p>

        {/* 2순위: 가격 */}
        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        {/* 3순위: 리뷰·설명 — 낮은 대비로 보조 */}
        <div className="mt-0.5 flex flex-col gap-1">
          {hasRating && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={rating} size="sm" interactive={false} />
              <span className="font-mono text-xs leading-none text-muted-foreground">
                {rating.toFixed(1)}
              </span>
              <span className="font-mono text-xs leading-none text-muted-foreground">
                ({reviewCount})
              </span>
            </div>
          )}

          {shortDescription && (
            <p className="line-clamp-1 text-xs text-muted-foreground leading-relaxed">
              {shortDescription}
            </p>
          )}
        </div>

        {/* 장바구니 담기 — 메타 아래 고정, hover 시 foreground 대비 강화 */}
        {!isSoldout && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isCartLoading}
            className={cn(
              'mt-auto flex w-full items-center justify-center gap-2 border border-border py-2',
              'typo-button text-foreground transition-colors',
              'hover:bg-foreground hover:text-background disabled:cursor-not-allowed',
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isCartLoading ? t('addingToCart') : t('addToCart')}
          </button>
        )}
      </div>
    </Link>
  );
}

export default memo(ProductCard);
