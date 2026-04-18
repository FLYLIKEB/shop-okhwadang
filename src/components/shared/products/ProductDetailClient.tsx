'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/shared/common/PriceDisplay'
import type { ProductDetail, ProductOption, Collection } from '@/lib/api'
import { wishlistApi } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useMobileNav } from '@/contexts/MobileNavContext'
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed'
import { cn } from '@/components/ui/utils'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import StarRating from '@/components/shared/reviews/StarRating'
import { formatCurrency, type Locale } from '@/utils/currency'

function findCollectionLabel(collections: Collection[], name: string): string {
  const found = collections.find((c) => c.name === name)
  if (!found) return name
  return found.name ?? name
}

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
  clayCollections?: Collection[]
  shapeCollections?: Collection[]
}

export default function ProductDetailClient({ product, locale = 'ko', clayCollections = [], shapeCollections = [] }: ProductDetailClientProps) {
  const router = useRouter()
  const t = useTranslations('product')
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
  const { isVisible: isNavVisible } = useMobileNav()
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<number | null>(null)

  useEffect(() => {
    addRecentlyViewed({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      salePrice: product.salePrice ?? null,
      thumbnail: product.images[0]?.url ?? null,
      slug: product.slug,
    })
  }, [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function checkWishlist() {
      try {
        const res = await wishlistApi.check(Number(product.id))
        setIsWishlisted(res.isWishlisted)
        setWishlistId(res.wishlistId)
      } catch {}
    }
    void checkWishlist()
  }, [product.id])

  const selectedOption: ProductOption | undefined = product.options.find(
    (o) => o.id === selectedOptionId,
  )
  const maxQuantity = selectedOption?.stock ?? product.stock
  const isSoldout = product.status === 'soldout'
  const descriptionImages = product.detailImages?.filter((img) => img.isActive) ?? []

  const basePrice = product.salePrice ?? product.price
  const unitPrice = basePrice + (selectedOption?.priceAdjustment ?? 0)
  const totalPrice = unitPrice * quantity


  const handleIncrease = useCallback(() => {
    setQuantity((q) => Math.min(q + 1, maxQuantity))
  }, [maxQuantity])

  const handleDecrease = useCallback(() => {
    setQuantity((q) => Math.max(q - 1, 1))
  }, [])

  const { execute: addToCart, isLoading: isAdding } = useAsyncAction(
    async () => {
      await addItem({ productId: Number(product.id), productOptionId: selectedOptionId, quantity })
    },
    { successMessage: t('addToCartSuccess'), errorMessage: t('addToCartError') },
  )

  const { execute: toggleWishlist, isLoading: isTogglingWishlist } = useAsyncAction(
    async () => {
      if (isWishlisted && wishlistId) {
        await wishlistApi.remove(wishlistId)
        setIsWishlisted(false)
        setWishlistId(null)
        toast.success(t('wishlistRemoveSuccess'))
      } else {
        const res = await wishlistApi.add(Number(product.id))
        setIsWishlisted(true)
        setWishlistId(res.id)
        toast.success(t('wishlistAddSuccess'))
      }
    },
    { errorMessage: t('wishlistError') },
  )

  const { execute: buyNow } = useAsyncAction(
    async () => {
      await addItem({ productId: Number(product.id), productOptionId: selectedOptionId, quantity })
      router.push('/checkout')
    },
    { errorMessage: t('buyNowError') },
  )

  const handleAddToCart = useCallback(() => {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error(t('selectOption'))
      return
    }
    void addToCart()
  }, [product.options.length, selectedOptionId, addToCart, t])

  const handleToggleWishlist = useCallback(() => {
    void toggleWishlist()
  }, [toggleWishlist])

  const handleBuyNow = useCallback(() => {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error(t('selectOption'))
      return
    }
    void buyNow()
  }, [product.options.length, selectedOptionId, buyNow, t])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
      {/* 갤러리 + 정보 영역 */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1fr]">
        {/* Left: Image gallery */}
        <div className="md:sticky md:top-14 md:self-start">
          <ImageGallery images={product.images} />
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col gap-6">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="typo-label text-muted-foreground tracking-widest uppercase">
              <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-foreground transition-colors">
                {product.category.name}
              </Link>
              <span className="mx-2 text-danni">·</span>
              <span className="text-foreground">{product.name}</span>
            </nav>
          )}

          {/* Clay type & Shape badges */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.attributes.map((attr) => {
                if (attr.attributeType?.code === 'clay_type') {
                  return (
                    <Link
                      key={attr.id}
                      href={`/products?attrs=clay_type:${encodeURIComponent(attr.value)}`}
                      className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
                    >
                      {t('clay')}: {findCollectionLabel(clayCollections, attr.value)}
                    </Link>
                  );
                }
                if (attr.attributeType?.code === 'teapot_shape') {
                  return (
                    <Link
                      key={attr.id}
                      href={`/products?attrs=teapot_shape:${encodeURIComponent(attr.value)}`}
                      className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
                    >
                      {t('shape')}: {findCollectionLabel(shapeCollections, attr.value)}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Name */}
          <h1 className="typo-h1 font-display text-foreground">{product.name}</h1>

          {/* 금박 구분선 */}
          <hr className="w-16 border-danni" />

          {/* Short description */}
          {product.shortDescription && (
            <p className="typo-body text-muted-foreground font-display leading-relaxed">{product.shortDescription}</p>
          )}

          {/* Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} size="md" interactive={false} />
              <span className="typo-body font-medium">{product.rating.toFixed(1)}</span>
              {product.reviewCount !== undefined && product.reviewCount > 0 && (
                <span className="typo-body text-muted-foreground">{t('reviewCount', { count: product.reviewCount })}</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="typo-h2">
            <PriceDisplay price={product.price} salePrice={product.salePrice} size="lg" locale={locale} />
          </div>

          {/* Options */}
          {product.options.length > 0 && (
            <OptionSelector
              options={product.options}
              selectedOptionId={selectedOptionId}
              onSelect={setSelectedOptionId}
            />
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-2">
            <span className="typo-label text-foreground">{t('quantity')}</span>
            <div className="flex items-center gap-3">
              <QuantitySelector
                quantity={quantity}
                maxQuantity={Math.max(maxQuantity, 1)}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
              />
              <span className="typo-body font-semibold text-foreground tabular-nums">
                {formatCurrency(totalPrice, locale)}
              </span>
            </div>
          </div>

          {/* Selected summary */}
          {(product.options.length === 0 || selectedOption) && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
              {selectedOption && (
                <div className="flex items-center justify-between">
                  <span className="typo-body-sm text-muted-foreground">
                    {selectedOption.name}: {selectedOption.value}
                    {selectedOption.priceAdjustment !== 0 && (
                      <span className="typo-label ml-1">
                        ({selectedOption.priceAdjustment > 0 ? '+' : ''}{formatCurrency(selectedOption.priceAdjustment, locale)})
                      </span>
                    )}
                  </span>
                  <span className="typo-body-sm text-foreground">{formatCurrency(unitPrice, locale)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="typo-body-sm text-muted-foreground">{t('selectedQuantity', { quantity })}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="typo-body-sm font-medium text-foreground">{t('totalProductPrice')}</span>
                <span className="typo-h2 font-semibold text-foreground">{formatCurrency(totalPrice, locale)}</span>
              </div>
            </div>
          )}

          {/* Action buttons — desktop only */}
          <div className="hidden md:flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isSoldout || isAdding}
              onClick={() => void handleAddToCart()}
            >
              {t('addToCart')}
            </Button>
            <Button
              className="flex-1"
              disabled={isSoldout || isAdding}
              onClick={() => void handleBuyNow()}
            >
              {t('buyNow')}
            </Button>
          </div>

          {isSoldout && (
            <p className="typo-body-sm font-medium text-destructive">{t('outOfStockMessage')}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4">
        <ProductTabs description={product.description} descriptionImages={descriptionImages} productId={Number(product.id)} />
      </div>

      {/* Mobile fixed bottom action bar — sits above MobileBottomNav (z-50, ~56px tall) */}
      <div className={isNavVisible ? 'md:hidden fixed bottom-14 left-0 right-0 z-50 border-t bg-background px-4 py-3 flex gap-3' : 'md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 py-3 flex gap-3'}>
        <button
          type="button"
          onClick={() => void handleToggleWishlist()}
          disabled={isTogglingWishlist}
          aria-label={isWishlisted ? t('removeFromWishlistAria') : t('addToWishlistAria')}
          className={cn(
            'flex items-center justify-center h-11 w-11 shrink-0 rounded-md border transition-colors',
            isWishlisted
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20',
          )}
        >
          <Heart className="h-5 w-5" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={isSoldout || isAdding}
          onClick={() => void handleAddToCart()}
        >
          {t('addToCart')}
        </Button>
        <Button
          className="flex-1"
          disabled={isSoldout || isAdding}
          onClick={() => void handleBuyNow()}
        >
          {t('buyNow')}
        </Button>
      </div>
    </div>
  )
}
