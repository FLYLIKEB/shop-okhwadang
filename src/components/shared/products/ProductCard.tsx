'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import { useWishlistToggle } from '@/components/shared/hooks/useWishlistToggle';
import type { Locale } from '@/utils/currency';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  shortDescription?: string | null;
  rating?: number;
  reviewCount?: number;
  categoryName?: string;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
  locale?: Locale;
  priority?: boolean;
  variant?: 'default' | 'minimal';
}

function ProductCard({
  id,
  name,
  price,
  salePrice,
  categoryName,
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
      <div className="relative aspect-square overflow-hidden border border-muted-foreground/20 rounded">
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

      <div className="mt-4 flex flex-col">
        {categoryName && (
          <p className="typo-label text-muted-foreground uppercase tracking-wider mb-1">{categoryName}</p>
        )}
        <p className="text-base font-semibold line-clamp-2 leading-tight shrink-0">{name}</p>
        <PriceDisplay price={price} salePrice={salePrice} locale={locale} />

        <div className="mt-auto pt-2">
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-center bg-foreground py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/80 shrink-0',
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
