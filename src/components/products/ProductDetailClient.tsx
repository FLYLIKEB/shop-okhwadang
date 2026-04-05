'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/common/PriceDisplay'
import type { ProductDetail, ProductOption, ProductDetailImage } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useMobileNav } from '@/contexts/MobileNavContext'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import StarRating from '@/components/reviews/StarRating'
import type { Locale } from '@/utils/currency'

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
}

export default function ProductDetailClient({ product, locale = 'ko' }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
  const { isVisible: isNavVisible } = useMobileNav()
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

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

  const selectedOption: ProductOption | undefined = product.options.find(
    (o) => o.id === selectedOptionId,
  )
  const maxQuantity = selectedOption?.stock ?? product.stock
  const isSoldout = product.status === 'soldout'
  const descriptionImages = product.detailImages?.filter((img) => img.isActive) ?? []


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
    <div className="pb-24 md:pb-0">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">
        {/* Left: Image gallery — sticky full-height */}
        <div className="sticky top-0 h-screen hidden md:block">
          <ImageGallery images={product.images} />
        </div>

        {/* Mobile: Image gallery non-sticky */}
        <div className="md:hidden">
          <ImageGallery images={product.images} />
        </div>

        {/* Right: Product info — generous padding */}
        <div className="flex flex-col gap-8 px-8 md:px-12 lg:px-16 xl:px-20 py-8 md:py-12">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="typo-label text-muted-foreground">
              <span>{product.category.name}</span>
              <span className="mx-1">/</span>
              <span className="text-foreground">{product.name}</span>
            </nav>
          )}

          {/* Name */}
          <h1 className="typo-h1 text-foreground leading-tight">{product.name}</h1>

          {/* Short description */}
          {product.shortDescription && (
            <p className="typo-body text-muted-foreground leading-relaxed">{product.shortDescription}</p>
          )}

          {/* Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-3">
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
          <div className="flex flex-col gap-3">
            <span className="typo-label text-foreground">수량</span>
            <QuantitySelector
              quantity={quantity}
              maxQuantity={Math.max(maxQuantity, 1)}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          </div>

          {/* Action buttons — desktop only */}
          <div className="hidden md:flex gap-4 pt-4">
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
