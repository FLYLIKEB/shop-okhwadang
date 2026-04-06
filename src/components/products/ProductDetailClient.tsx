'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/common/PriceDisplay'
import type { ProductDetail, ProductOption, ProductDetailImage, Collection } from '@/lib/api'
import { wishlistApi } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useMobileNav } from '@/contexts/MobileNavContext'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { cn } from '@/components/ui/utils'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import StarRating from '@/components/reviews/StarRating'
import { formatCurrency, type Locale } from '@/utils/currency'

function findCollectionLabel(collections: Collection[], name: string): string {
  const found = collections.find((c) => c.name === name)
  return found?.nameKo ?? name
}

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
  clayCollections?: Collection[]
  shapeCollections?: Collection[]
}

export default function ProductDetailClient({ product, locale = 'ko', clayCollections = [], shapeCollections = [] }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
  const { isVisible: isNavVisible } = useMobileNav()
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<number | null>(null)
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)

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


  function handleIncrease() {
    setQuantity((q) => Math.min(q + 1, maxQuantity))
  }

  async function handleAddToCart() {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error('옵션을 선택해 주세요.')
      return
    }
    setIsAdding(true)
    try {
      await addItem({ productId: Number(product.id), productOptionId: selectedOptionId, quantity })
      toast.success('장바구니에 담았습니다.')
    } catch {
      toast.error('장바구니 담기에 실패했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  function handleDecrease() {
    setQuantity((q) => Math.max(q - 1, 1))
  }

  async function handleToggleWishlist() {
    setIsTogglingWishlist(true)
    try {
      if (isWishlisted && wishlistId) {
        await wishlistApi.remove(wishlistId)
        setIsWishlisted(false)
        setWishlistId(null)
        toast.success('위시리스트에서 삭제しました。')
      } else {
        const res = await wishlistApi.add(Number(product.id))
        setIsWishlisted(true)
        setWishlistId(res.id)
        toast.success('위시리스트에 추가했습니다。')
      }
    } catch {
      toast.error('위시리스트 처리 중 오류가 발생했습니다。')
    } finally {
      setIsTogglingWishlist(false)
    }
  }

  async function handleBuyNow() {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error('옵션을 선택해 주세요.')
      return
    }
    setIsAdding(true)
    try {
      await addItem({ productId: Number(product.id), productOptionId: selectedOptionId, quantity })
      router.push('/checkout')
    } catch {
      toast.error('구매 처리 중 오류가 발생했습니다.')
      setIsAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Image gallery */}
        <ImageGallery images={product.images} />

        {/* Right: Product info */}
        <div className="flex flex-col gap-6">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="typo-label text-muted-foreground">
              <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
                {product.category.name}
              </Link>
              <span className="mx-1">/</span>
              <span className="text-foreground">{product.name}</span>
            </nav>
          )}

          {/* Clay type & Shape badges */}
          {(product.clayType || product.teapotShape) && (
            <div className="flex flex-wrap gap-2">
              {product.clayType && (
                <Link
                  href={`/products?clayType=${encodeURIComponent(product.clayType)}`}
                  className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
                >
                  니료: {findCollectionLabel(clayCollections, product.clayType)}
                </Link>
              )}
              {product.teapotShape && (
                <Link
                  href={`/products?teapotShape=${encodeURIComponent(product.teapotShape)}`}
                  className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
                >
                  모양: {findCollectionLabel(shapeCollections, product.teapotShape)}
                </Link>
              )}
            </div>
          )}

          {/* Name */}
          <h1 className="typo-h1 text-foreground">{product.name}</h1>

          {/* Short description */}
          {product.shortDescription && (
            <p className="typo-body text-muted-foreground">{product.shortDescription}</p>
          )}

          {/* Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} size="md" interactive={false} />
              <span className="typo-body font-medium">{product.rating.toFixed(1)}</span>
              {product.reviewCount !== undefined && product.reviewCount > 0 && (
                <span className="typo-body text-muted-foreground">({product.reviewCount}개의 후기)</span>
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
            <span className="typo-label text-foreground">수량</span>
            <div className="flex items-center gap-3">
              <QuantitySelector
                quantity={quantity}
                maxQuantity={Math.max(maxQuantity, 1)}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
              />
              <span className="text-base font-semibold text-foreground tabular-nums">
                {formatCurrency(totalPrice, locale)}
              </span>
            </div>
          </div>

          {/* Selected summary */}
          {(product.options.length === 0 || selectedOption) && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
              {selectedOption && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedOption.name}: {selectedOption.value}
                    {selectedOption.priceAdjustment !== 0 && (
                      <span className="ml-1 text-xs">
                        ({selectedOption.priceAdjustment > 0 ? '+' : ''}{formatCurrency(selectedOption.priceAdjustment, locale)})
                      </span>
                    )}
                  </span>
                  <span className="text-foreground">{formatCurrency(unitPrice, locale)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">수량 {quantity}개</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-foreground">총 상품금액</span>
                <span className="text-xl font-bold text-foreground">{formatCurrency(totalPrice, locale)}</span>
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
              장바구니 담기
            </Button>
            <Button
              className="flex-1"
              disabled={isSoldout || isAdding}
              onClick={() => void handleBuyNow()}
            >
              바로 구매
            </Button>
          </div>

          {isSoldout && (
            <p className="text-sm font-medium text-destructive">현재 품절된 상품입니다.</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ProductTabs description={product.description} descriptionImages={descriptionImages} productId={Number(product.id)} />

      {/* Mobile fixed bottom action bar — sits above MobileBottomNav (z-50, ~56px tall) */}
      <div className={isNavVisible ? 'md:hidden fixed bottom-14 left-0 right-0 z-50 border-t bg-background px-4 py-3 flex gap-3' : 'md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 py-3 flex gap-3'}>
        <button
          type="button"
          onClick={() => void handleToggleWishlist()}
          disabled={isTogglingWishlist}
          aria-label={isWishlisted ? '위시리스트에서 삭제' : '위시리스트에 추가'}
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
          장바구니 담기
        </Button>
        <Button
          className="flex-1"
          disabled={isSoldout || isAdding}
          onClick={() => void handleBuyNow()}
        >
          바로 구매
        </Button>
      </div>
    </div>
  )
}
