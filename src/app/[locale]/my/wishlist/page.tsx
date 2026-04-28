'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { wishlistApi, cartApi } from '@/lib/api';
import type { WishlistItem } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/components/ui/utils';
import PriceDisplay from '@/components/shared/common/PriceDisplay';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

export default function WishlistPage() {
  const t = useTranslations('wishlist');
  const tProduct = useTranslations('product');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);

  const { execute: loadWishlist, isLoading: dataLoading } = useAsyncAction(
    async () => {
      const res = await wishlistApi.getList();
      setItems(res.data);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadWishlist();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const { execute: removeItem } = useAsyncAction(
    async (wishlistId: number) => {
      await wishlistApi.remove(wishlistId);
      setItems((prev) => prev.filter((item) => item.id !== wishlistId));
    },
    { successMessage: t('removeSuccess'), errorMessage: t('removeError') },
  );

  const { execute: addToCartAction } = useAsyncAction(
    async (productId: number) => {
      await cartApi.add({ productId, productOptionId: null, quantity: 1 });
    },
    { successMessage: t('addCartSuccess'), errorMessage: t('addCartError') },
  );

  const handleRemove = (wishlistId: number) => { void removeItem(wishlistId); };
  const handleAddToCart = (productId: number) => { void addToCartAction(productId); };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonBox width="w-40" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 typo-h1">{t('title')}</h1>

      {dataLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} height="h-64" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t('noItems')}
          description={t('noItemsDescription')}
          action={{ label: t('goShopping'), onClick: () => router.push('/products') }}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => {
            const product = item.product;
            const isSoldout = product?.status === 'soldout';
            const thumbnail = product?.images.find((img) => img.isThumbnail)?.url ?? product?.images[0]?.url;

            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Link href={`/products/${item.productId}`} className="block h-full w-full">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product?.name ?? ''}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <span className="text-sm">No Image</span>
                      </div>
                    )}
                    {isSoldout && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-md bg-black/70 px-3 py-1 text-sm font-semibold text-white">
                          {tProduct('soldout')}
                        </span>
                      </div>
                    )}
                  </Link>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <Link href={`/products/${item.productId}`} className="line-clamp-2 text-sm font-medium hover:underline">
                    {product?.name ?? t('noProductInfo')}
                  </Link>
                  {product && (
                    <div className="mt-auto">
                      <PriceDisplay price={product.price} salePrice={product.salePrice} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSoldout}
                      onClick={() => handleAddToCart(item.productId)}
                      className={cn(
                        'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                        isSoldout
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-primary hover:text-primary-foreground',
                      )}
                    >
                      {tProduct('addToCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded-md border px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
