'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import type { ProductImage } from '@/lib/api';
import { wishlistApi } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  status: 'active' | 'soldout' | 'inactive' | 'draft' | 'hidden';
  images: ProductImage[];
  isFeatured?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  salePrice,
  status,
  images,
}: ProductCardProps) {
  const thumbnail = images[0]?.url;
  const isSoldout = status === 'soldout';

  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState<number | null>(null);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
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

  const handleToggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (isWishlistLoading) return;

      if (!isAuthenticated) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      setIsWishlistLoading(true);
      try {
        if (isWishlisted && wishlistId !== null) {
          await wishlistApi.remove(wishlistId);
          setIsWishlisted(false);
          setWishlistId(null);
          toast.success('찜 목록에서 제거했습니다.');
        } else {
          const res = await wishlistApi.add(id);
          setIsWishlisted(true);
          setWishlistId(res.id);
          toast.success('찜 목록에 추가했습니다.');
        }
      } catch {
        toast.error('찜하기 처리에 실패했습니다.');
      } finally {
        setIsWishlistLoading(false);
      }
    },
    [id, isAuthenticated, isWishlisted, wishlistId, isWishlistLoading],
  );

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
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-sm">No Image</span>
          </div>
        )}

        {isSoldout && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="text-sm font-medium text-foreground">품절</span>
          </div>
        )}

        {/* 찜하기 버튼 — 데스크탑: hover 시 표시, 모바일: 항상 표시 */}
        <button
          type="button"
          aria-label={isWishlisted ? '찜하기 취소' : '찜하기'}
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className={cn(
            'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm transition-opacity duration-200 disabled:cursor-not-allowed',
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

        {/* 장바구니 버튼 — 데스크탑: hover 시 slide-up, 모바일: 항상 표시 */}
        {!isSoldout && (
          <button
            type="button"
            aria-label="장바구니 담기"
            onClick={handleAddToCart}
            disabled={isCartLoading}
            className={cn(
              'absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-foreground/90 py-2 text-sm font-medium text-background transition-transform duration-300 disabled:cursor-not-allowed',
              'translate-y-0 md:translate-y-full md:group-hover:translate-y-0',
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {isCartLoading ? '담는 중...' : '장바구니 담기'}
          </button>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">{name}</h3>
        <div className="mt-1">
          <PriceDisplay price={price} salePrice={salePrice} />
        </div>
      </div>
    </Link>
  );
}
