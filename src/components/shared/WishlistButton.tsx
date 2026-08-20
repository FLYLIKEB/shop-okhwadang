'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useWishlistToggle } from '@/components/shared/hooks/useWishlistToggle';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

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
    <Button
      type="button"
      variant="gray"
      size="icon"
      onClick={toggle}
      aria-label={isWishlisted ? localMessage('wishlist.remove') : localMessage('wishlist.add')}
      className={cn(
        'h-10 min-h-10 w-10 rounded-full',
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
    </Button>
  );
}
