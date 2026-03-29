'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import { wishlistApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
  const [wishlistId, setWishlistId] = useState<number | null>(initialWishlistId);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isPending) return;
    setIsPending(true);

    // Optimistic update
    const prevIsWishlisted = isWishlisted;
    const prevWishlistId = wishlistId;
    setIsWishlisted(!isWishlisted);

    try {
      if (isWishlisted && wishlistId != null) {
        await wishlistApi.remove(wishlistId);
        setWishlistId(null);
        toast.success('위시리스트에서 삭제되었습니다.');
      } else {
        const result = await wishlistApi.add(productId);
        setWishlistId(result.id);
        toast.success('위시리스트에 추가되었습니다.');
      }
    } catch {
      // Rollback on failure
      setIsWishlisted(prevIsWishlisted);
      setWishlistId(prevWishlistId);
      toast.error('위시리스트 처리에 실패했습니다.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isWishlisted ? '위시리스트에서 삭제' : '위시리스트에 추가'}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition-colors',
        'hover:bg-muted',
        isPending && 'opacity-60 cursor-not-allowed',
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
