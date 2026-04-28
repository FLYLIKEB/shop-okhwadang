'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useWishlistToggle } from '@/components/shared/hooks/useWishlistToggle';

interface WishlistButtonProps {
  productId: number;
  initialIsWishlisted?: boolean;
  initialWishlistId?: number | null;
  className?: string;
}

export default function WishlistButton({
  productId,
  initialIsWishlisted = false,
  initialWishlistId = null,
  className,
}: WishlistButtonProps) {
  const { isWishlisted, loading, toggle } = useWishlistToggle(productId, {
    initialIsWishlisted,
    initialWishlistId,
  });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isWishlisted ? '위시리스트에서 삭제' : '위시리스트에 추가'}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition-colors',
        'hover:bg-muted',
        loading && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <Heart
        size={20}
        className={cn(
          'transition-colors',
          isWishlisted ? 'fill-red-500 stroke-red-500' : 'stroke-muted-foreground',
        )}
      />
    </button>
  );
}
