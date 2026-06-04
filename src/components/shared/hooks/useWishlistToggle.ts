'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { wishlistApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toastMessage } from '@/utils/toastMessages';

interface UseWishlistToggleOptions {
  initialIsWishlisted?: boolean;
  initialWishlistId?: number | null;
}

interface UseWishlistToggleReturn {
  isWishlisted: boolean;
  loading: boolean;
  toggle: (e: React.MouseEvent) => Promise<void>;
}

export function useWishlistToggle(
  productId: number,
  options: UseWishlistToggleOptions = {},
): UseWishlistToggleReturn {
  const { initialIsWishlisted = false, initialWishlistId = null } = options;

  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
  const [wishlistId, setWishlistId] = useState<number | null>(initialWishlistId);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prevIsWishlisted = isWishlisted;
    const prevWishlistId = wishlistId;
    setIsWishlisted(!isWishlisted);

    try {
      if (isWishlisted && wishlistId != null) {
        await wishlistApi.remove(wishlistId);
        setWishlistId(null);
        toast.success(toastMessage('wishlistRemoved'));
      } else {
        const result = await wishlistApi.add(productId);
        setWishlistId(result.id);
        toast.success(toastMessage('wishlistAdded'));
      }
    } catch {
      // Rollback on failure
      setIsWishlisted(prevIsWishlisted);
      setWishlistId(prevWishlistId);
      toast.error(toastMessage('wishlistError'));
    } finally {
      setLoading(false);
    }
  };

  return { isWishlisted, loading, toggle };
}
