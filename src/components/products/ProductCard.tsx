'use client';

import { useState, useCallback } from 'react';
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
}

export default function ProductCard({
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
  showCartOnHover = false,
}: ProductCardProps) {
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';

  const { addItem } = useCart();
  const { isWishlisted, loading: isWishlistLoading, toggle: handleToggleWishlist } = useWishlistToggle(id);

  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      onMouseEnter={() => showCartOnHover && setIsHovered(true)}
      onMouseLeave={() => showCartOnHover && setIsHovered(false)}
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
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className={cn(
            'absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm transition-opacity duration-200 disabled:cursor-not-allowed',
            'opacity-100 md:opacity-0 md:group-hover:opacity-100',
          )}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-foreground',
            )}
          />
        </button>

        {!isSoldout && (
          <button
            type="button"
            aria-label="장바구니 담기"
            onClick={handleAddToCart}
            disabled={isCartLoading}
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm py-3 typo-body-sm text-foreground border-t border-foreground/10 transition-transform duration-300 disabled:cursor-not-allowed',
              showCartOnHover
                ? isHovered ? 'translate-y-0' : 'translate-y-full'
                : 'translate-y-0 md:translate-y-full md:group-hover:translate-y-0',
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {isCartLoading ? '담는 중...' : '장바구니 담기'}
          </button>
        )}
      </div>

      <div className="mt-3">
        <p className="typo-title line-clamp-2">{name}</p>
        <div className="mt-1">
          <PriceDisplay price={price} salePrice={salePrice} locale={locale} />
        </div>
        {rating !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[#4A6741]">★</span>
            <span className="typo-label">{rating.toFixed(1)}</span>
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="typo-label text-muted-foreground">({reviewCount})</span>
            )}
          </div>
        )}
        {shortDescription && (
          <p className="mt-1 line-clamp-2 typo-body-sm text-muted-foreground">{shortDescription}</p>
        )}
      </div>
    </Link>
  );
}
