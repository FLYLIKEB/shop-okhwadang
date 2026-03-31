'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/common/PriceDisplay'
import type { ProductDetail, ProductOption } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import type { Locale } from '@/utils/currency'

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
}

export default function ProductDetailClient({ product, locale = 'ko' }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
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
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Image gallery */}
        <ImageGallery images={product.images} />

        {/* Right: Product info */}
        <div className="flex flex-col gap-6">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="text-sm text-muted-foreground">
              <span>{product.category.name}</span>
              <span className="mx-1">/</span>
              <span className="text-foreground">{product.name}</span>
            </nav>
          )}

          {/* Name */}
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
          )}

          {/* Price */}
          <PriceDisplay price={product.price} salePrice={product.salePrice} size="lg" locale={locale} />

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
            <span className="text-sm font-medium text-foreground">수량</span>
            <QuantitySelector
              quantity={quantity}
              maxQuantity={Math.max(maxQuantity, 1)}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          </div>

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
      <ProductTabs description={product.description} productId={Number(product.id)} />

      {/* Mobile fixed bottom action bar — sits above MobileBottomNav (z-50, ~56px tall) */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 border-t bg-background px-4 py-3 flex gap-3">
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
