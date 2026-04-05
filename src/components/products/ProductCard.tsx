'use client';

import { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';
import { useCart } from '@/contexts/CartContext';
import { useWishlistToggle } from '@/hooks/useWishlistToggle';
import type { Locale } from '@/utils/currency';
import StarRating from '@/components/reviews/StarRating';

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
  isFeatured?: boolean;
  locale?: Locale;
  priority?: boolean;
  showCartOnHover?: boolean;
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
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';
  const clayTagClass = categoryName ? getClayTagClass(categoryName) : null;

  const { addItem } = useCart();
  const { isWishlisted, loading: isWishlistLoading, toggle: handleToggleWishlist } = useWishlistToggle(id);

  const [isCartLoading, setIsCartLoading] = useState(false);

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (isSoldout || isCartLoading) return;
      setIsCartLoading(true);
      try {
        await addItem({ productId: id, productOptionId: null, quantity: 1 });
        toast.success('장바구니에 담았습니다.');
      } catch {
        toast.error('장바구니 담기에 실패했습니다.');
      } finally {
        setIsCartLoading(false);
      }
    },
    [id, isSoldout, isCartLoading, addItem],
  );

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        'group block',
        isSoldout && 'opacity-60',
      )}
    >
      {/* ── 이미지 영역 ── */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-103"
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

        {/* 니료 태그 배지 — 좌하단 */}
        {clayTagClass && (
          <span className={cn('absolute left-2 bottom-2 z-10 px-2 py-0.5 rounded-sm', clayTagClass)}>
            {categoryName}
          </span>
        )}

        {/* 찜하기 버튼 — 우상단 */}
        <button
          type="button"
          aria-label={isWishlisted ? '찜하기 취소' : '찜하기'}
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm disabled:cursor-not-allowed transition-colors hover:bg-background/80"
        >
          <Heart
            className={cn(
              'h-3.5 w-3.5 transition-colors',
              isWishlisted ? 'fill-foreground text-foreground' : 'text-foreground/60',
            )}
          />
        </button>
      </div>

      {/* ── 정보 영역 — 공방 도면 스타일 ── */}
      <div className="mt-2.5 flex flex-col gap-1">
        {/* 카테고리 라벨 (니료 태그가 없을 때) */}
        {categoryName && !clayTagClass && (
          <span className="data-label">{categoryName}</span>
        )}

        <p className="typo-title line-clamp-2 leading-snug min-h-[2.5rem] shrink-0">{name}</p>

        {/* 리뷰 */}
        <div className="flex items-center gap-1.5 h-4 shrink-0">
          {rating !== undefined && (
            <>
              <StarRating rating={rating} size="sm" interactive={false} />
              <span className="font-mono text-xs leading-none text-muted-foreground">{rating.toFixed(1)}</span>
              {reviewCount !== undefined && reviewCount > 0 && (
                <span className="font-mono text-xs text-muted-foreground leading-none">({reviewCount})</span>
              )}
            </>
          )}
        </div>

        {shortDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{shortDescription}</p>
        )}

        {/* 구분선 — 가느다란 보더 */}
        <div className="pt-2">
          <hr className="border-border" />
        </div>

        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        {!isSoldout && (
          <button
            type="button"
            aria-label="장바구니 담기"
            onClick={handleAddToCart}
            disabled={isCartLoading}
            className={cn(
              'flex w-full items-center justify-center gap-2 border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed shrink-0 font-mono tracking-wide',
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isCartLoading ? '담는 중...' : '장바구니 담기'}
          </button>
        )}
      </div>
    </Link>
  );
}

export default memo(ProductCard);
