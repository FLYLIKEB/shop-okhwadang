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

import PriceDisplay from '@/components/shared/common/PriceDisplay';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { AccountPageHeader } from '@/components/shared/account/AccountPageHeader';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';
import { Button } from '@/components/ui/button';

interface WishlistProductImageProps {
  thumbnail?: string;
  name: string;
  isSoldout: boolean;
  soldoutLabel: string;
}

function WishlistProductImage({ thumbnail, name, isSoldout, soldoutLabel }: WishlistProductImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div data-testid="wishlist-product-image-frame" className="relative aspect-square overflow-hidden bg-muted">
      {thumbnail && !hasImageError ? (
        <Image
          src={thumbnail}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div data-testid="wishlist-product-image-fallback" className="flex h-full w-full items-center justify-center bg-neutral-200">
          <Image
            src="/logo-okhwadang.png"
            alt="옥화당"
            width={120}
            height={34}
            className="object-contain opacity-70 grayscale"
          />
        </div>
      )}
      {isSoldout && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="bg-black/70 px-3 py-1 text-sm font-semibold text-white">
            {soldoutLabel}
          </span>
        </div>
      )}
    </div>
  );
}

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
    <AccountPageShell maxWidth="max-w-4xl">
      <AccountPageHeader title={t('title')} />

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
            const thumbnailImage = product?.images.find((img) => img.isThumbnail) ?? product?.images[0];
            const thumbnail = thumbnailImage?.thumbnailUrl ?? thumbnailImage?.url;

            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                <Link href={`/products/${item.productId}`} className="block">
                  <WishlistProductImage
                    thumbnail={thumbnail}
                    name={product?.name ?? ''}
                    isSoldout={isSoldout}
                    soldoutLabel={tProduct('soldout')}
                  />
                </Link>

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
                    <Button
                      type="button"
                      variant="black"
                      size="sm"
                      disabled={isSoldout}
                      onClick={() => handleAddToCart(item.productId)}
                      className="flex-1"
                    >
                      {tProduct('addToCart')}
                    </Button>
                    <Button
                      type="button"
                      variant="gray"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                    >
                      {tCommon('delete')}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountPageShell>
  );
}
