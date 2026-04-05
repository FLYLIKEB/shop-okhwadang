'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';
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
}: ProductCardProps) {
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';

  const { isWishlisted, loading: isWishlistLoading, toggle: handleToggleWishlist } = useWishlistToggle(id);

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        'group block',
        isSoldout && 'opacity-60',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="typo-label">No Image</span>
          </div>
        )}

        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="typo-label text-foreground">품절</span>
          </div>
        )}

        <button
          type="button"
          aria-label={isWishlisted ? '찜하기 취소' : '찜하기'}
          onClick={(e) => {
            e.preventDefault();
            handleToggleWishlist(e);
          }}
          disabled={isWishlistLoading}
          className={cn(
            'absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 shadow-sm disabled:cursor-not-allowed backdrop-blur-sm',
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isWishlisted ? 'fill-white text-white' : 'text-white',
            )}
          />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <p className="typo-title font-display line-clamp-2 leading-tight h-11 shrink-0">{name}</p>

        <div className="flex items-center gap-1.5 h-5 shrink-0">
          {rating !== undefined && (
            <>
              <StarRating rating={rating} size="sm" interactive={false} />
              <span className="typo-body-sm font-medium leading-none">{rating.toFixed(1)}</span>
              {reviewCount !== undefined && reviewCount > 0 && (
                <span className="typo-body-sm text-muted-foreground leading-none">({reviewCount})</span>
              )}
            </>
          )}
        </div>

        <div className="h-10 overflow-hidden">
          {shortDescription && (
            <p className="line-clamp-2 typo-body-sm text-muted-foreground leading-snug">{shortDescription}</p>
          )}
        </div>

        <div className="mt-auto pt-2">
          <hr className="border-[#D4BC8E]" />
        </div>

        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        <div className="mt-auto pt-2">
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-center border border-foreground py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background shrink-0',
            )}
          >
            자세히 보기
          </button>
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard);