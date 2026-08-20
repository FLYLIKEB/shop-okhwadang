'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { toast } from 'sonner'
import { ChevronDown, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/shared/common/PriceDisplay'
import type { CartItem, ProductDetail, ProductOption } from '@/lib/api'
import { wishlistApi } from '@/lib/api'
import { SESSION_KEYS } from '@/constants/storage'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useMobileNav } from '@/contexts/MobileNavContext'
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed'
import { cn } from '@/components/ui/utils'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import ProductRatingSummary from './ProductRatingSummary'
import { formatCurrency, type Locale } from '@/utils/currency'

function getClayTagClass(value: string): string {
  const key = value.toLowerCase()
  if (key.includes('주니') || key.includes('zuni')) return 'tag-zuni'
  if (key.includes('단니') || key.includes('danni')) return 'tag-danni'
  if (key.includes('자니') || key.includes('zini')) return 'tag-zini'
  if (key.includes('흑니') || key.includes('heukni')) return 'tag-heukni'
  if (key.includes('청수니') || key.includes('chunsuni')) return 'tag-chunsuni'
  if (key.includes('녹니') || key.includes('nokni')) return 'tag-nokni'
  return 'tag-generic'
}

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
}

function toSafeInteger(value: unknown, minimum: number): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '')
  ) {
    throw new Error('Invalid numeric value')
  }
  const normalized = Number(value)
  if (!Number.isSafeInteger(normalized) || normalized < minimum) {
    throw new Error('Invalid numeric value')
  }
  return normalized
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

export function buildBuyNowCheckoutItem(
  product: ProductDetail,
  selectedOption: ProductOption | undefined,
  quantity: number,
): CartItem {
  let productId: number
  let price: number
  let salePrice: number | null
  if (
    !product.name ||
    !product.slug ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error('Invalid buy-now product selection')
  }
  try {
    productId = toSafeInteger(product.id, 1)
    price = toSafeInteger(product.price, 0)
    salePrice = product.salePrice === null
      ? null
      : toSafeInteger(product.salePrice, 0)
  } catch {
    throw new Error('Invalid buy-now product selection')
  }

  let selectedOptionId: number | undefined
  if (selectedOption) {
    try {
      selectedOptionId = toSafeInteger(selectedOption.id, 1)
    } catch {
      throw new Error('Invalid buy-now product option')
    }
  }
  const canonicalOption = selectedOptionId
    ? product.options.find((option) => {
      try {
        return toSafeInteger(option.id, 1) === selectedOptionId
      } catch {
        return false
      }
    })
    : undefined
  let optionId: number | null = null
  let priceAdjustment = 0
  let availableStock: number
  if (product.options.length > 0) {
    if (
      !canonicalOption ||
      !canonicalOption.name ||
      !canonicalOption.value
    ) {
      throw new Error('Invalid buy-now product option')
    }
    try {
      optionId = toSafeInteger(canonicalOption.id, 1)
      priceAdjustment = toSafeInteger(canonicalOption.priceAdjustment, Number.MIN_SAFE_INTEGER)
      availableStock = toSafeInteger(canonicalOption.stock, 0)
    } catch {
      throw new Error('Invalid buy-now product option')
    }
  } else if (selectedOption) {
    throw new Error('Invalid buy-now product option')
  } else {
    try {
      availableStock = toSafeInteger(product.stock, 0)
    } catch {
      throw new Error('Invalid buy-now product selection')
    }
  }

  const basePrice = salePrice ?? price
  const unitPrice = basePrice + priceAdjustment
  const subtotal = unitPrice * quantity

  if (
    availableStock < quantity ||
    !Number.isSafeInteger(unitPrice) ||
    unitPrice < 0 ||
    !Number.isSafeInteger(subtotal) ||
    subtotal < 0
  ) {
    throw new Error('Invalid buy-now product selection')
  }

  return {
    id: -productId,
    productId,
    productOptionId: optionId,
    checkoutSource: 'buy_now',
    quantity,
    unitPrice,
    subtotal,
    product: {
      id: productId,
      name: product.name,
      slug: product.slug,
      price,
      salePrice,
      status: product.status,
      isFreeShipping: product.isFreeShipping,
      images: product.images,
    },
    option: canonicalOption
      ? {
          id: optionId!,
          name: canonicalOption.name,
          value: canonicalOption.value,
          priceAdjustment,
        }
      : null,
  }
}

export default function ProductDetailClient({ product, locale = 'ko' }: ProductDetailClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('product')
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
  const { isVisible: isNavVisible } = useMobileNav()
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isMobilePurchasePanelOpen, setIsMobilePurchasePanelOpen] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<number | null>(null)
  const optionSectionRef = useRef<HTMLDivElement>(null)
  const mobileOptionSectionRef = useRef<HTMLDivElement>(null)
  const buyNowStartedRef = useRef(false)
  const viewedThumbnail = product.images.find((image) => image.isThumbnail) ?? product.images[0]

  useEffect(() => {
    addRecentlyViewed({
      id: Number(product.id),
      name: product.name,
      price: toFiniteNumber(product.price),
      salePrice: product.salePrice == null ? null : toFiniteNumber(product.salePrice),
      thumbnail: viewedThumbnail?.url ?? null,
      slug: product.slug,
    })
  }, [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthenticated) {
      setIsWishlisted(false)
      setWishlistId(null)
      return
    }

    async function checkWishlist() {
      try {
        const res = await wishlistApi.check(Number(product.id))
        setIsWishlisted(res.isWishlisted)
        setWishlistId(res.wishlistId)
      } catch {}
    }
    void checkWishlist()
  }, [isAuthenticated, product.id])

  const loginHref = useMemo(() => {
    if (!pathname) return '/login'
    return `/login?redirect=${encodeURIComponent(pathname)}`
  }, [pathname])

  const selectedOption: ProductOption | undefined = product.options.find(
    (o) => o.id === selectedOptionId,
  )
  const maxQuantity = toFiniteNumber(selectedOption?.stock ?? product.stock)
  const isSoldout = product.status === 'soldout' || maxQuantity === 0
  const isLowStock = !isSoldout && maxQuantity > 0 && maxQuantity <= 5
  const descriptionImages = product.detailImages?.filter((img) => img.isActive) ?? []

  const normalizedPrice = toFiniteNumber(product.price)
  const normalizedSalePrice = product.salePrice == null ? null : toFiniteNumber(product.salePrice)
  const optionPriceAdjustment = toFiniteNumber(selectedOption?.priceAdjustment)
  const basePrice = normalizedSalePrice ?? normalizedPrice
  const unitPrice = basePrice + optionPriceAdjustment
  const totalPrice = unitPrice * quantity
  const discountPercent = useMemo(() => {
    if (!normalizedSalePrice || normalizedSalePrice >= normalizedPrice || normalizedPrice <= 0) return 0
    return Math.round(((normalizedPrice - normalizedSalePrice) / normalizedPrice) * 100)
  }, [normalizedPrice, normalizedSalePrice])


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

  const { execute: buyNow, isLoading: isBuying } = useAsyncAction(
    async () => {
      if (buyNowStartedRef.current) return
      buyNowStartedRef.current = true
      try {
        const checkoutItem = buildBuyNowCheckoutItem(product, selectedOption, quantity)
        sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([checkoutItem]))
        router.push('/checkout', { locale })
      } catch (error) {
        buyNowStartedRef.current = false
        throw error
      }
    },
    { errorMessage: t('buyNowError') },
  )

  const focusOptionSection = useCallback(() => {
    if (optionSectionRef.current && typeof optionSectionRef.current.scrollIntoView === 'function') {
      const target = window.matchMedia('(max-width: 767px)').matches
      ? mobileOptionSectionRef.current
      : optionSectionRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.setTimeout(() => {
      const button = optionSectionRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')
      button?.focus()
    }, 120)
  }, [])

  const handleAddToCart = useCallback(() => {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error(t('selectOption'))
      focusOptionSection()
      return
    }
    void addToCart()
  }, [product.options.length, selectedOptionId, addToCart, t, focusOptionSection])

  const handleToggleWishlist = useCallback(() => {
    if (!isAuthenticated) {
      router.push(loginHref)
      return
    }
    void toggleWishlist()
  }, [isAuthenticated, loginHref, router, toggleWishlist])

  const handleBuyNow = useCallback(() => {
    if (product.options.length > 0 && !selectedOptionId) {
      toast.error(t('selectOption'))
      focusOptionSection()
      return
    }
    void buyNow()
  }, [product.options.length, selectedOptionId, buyNow, t, focusOptionSection])

  const handleMobileBuyNow = useCallback(() => {
    if (!isMobilePurchasePanelOpen) {
      setIsMobilePurchasePanelOpen(true)
      return
    }
    handleBuyNow()
  }, [handleBuyNow, isMobilePurchasePanelOpen])

  const renderQuantitySection = (className: string) => (
    <div className={cn('toss-product-detail__quantity items-center justify-between gap-3 rounded-xl px-0 py-1', className)}>
      <div className="flex items-center gap-2">
        <span className="typo-body-sm font-semibold text-foreground">{t('quantity')}</span>
        {isLowStock && (
          <span className="rounded-full bg-destructive/10 px-2 py-1 typo-label font-semibold text-destructive">
            {t('lowStock', { count: maxQuantity })}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <QuantitySelector
          quantity={quantity}
          maxQuantity={Math.max(maxQuantity, 1)}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
        />
        <span className="typo-price whitespace-nowrap text-foreground tabular-nums">
          {formatCurrency(totalPrice, locale)}
        </span>
      </div>
    </div>
  )

  return (
    <div className="toss-product-detail layout-container layout-page pb-72 md:pb-8">
      {/* 갤러리 + 정보 영역 */}
      <div className="grid grid-cols-1 gap-4 md:gap-10 md:grid-cols-[1.15fr_1fr]">
        {/* Left: Image gallery */}
        <div className="md:sticky sticky-below-header md:self-start">
          <ImageGallery images={product.images} locale={locale} />
        </div>

        {/* Right: Product info */}
        <div className="toss-product-detail__info flex flex-col gap-4 p-4 md:p-6">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="typo-body-sm font-medium text-muted-foreground">
              <Link href={`/products?categoryId=${product.category.id}`} locale={locale} className="hover:text-foreground transition-colors">
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
                      locale={locale}
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 typo-body-sm font-medium transition-colors',
                        'tag-clay border-transparent',
                        getClayTagClass(attr.value),
                      )}
                    >
                      {t('clay')}: {attr.displayValue ?? attr.value}
                    </Link>
                  );
                }
                if (attr.attributeType?.code === 'teapot_shape') {
                  return (
                    <Link
                      key={attr.id}
                      href={`/products?attrs=teapot_shape:${encodeURIComponent(attr.value)}`}
                      locale={locale}
                      className="inline-flex items-center rounded-full bg-muted px-3 py-1 typo-body-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {t('shape')}: {attr.displayValue ?? attr.value}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Name */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 toss-product-detail__title text-foreground">{product.name}</h1>
            <ProductRatingSummary
              rating={product.rating}
              reviewCount={product.reviewCount}
              className="rounded-full px-2.5 py-1"
            />
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <p className="typo-body-sm font-normal leading-relaxed text-muted-foreground">{product.shortDescription}</p>
          )}

          {/* Price */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="font-body text-foreground">
                <PriceDisplay price={normalizedPrice} salePrice={normalizedSalePrice} size="lg" locale={locale} />
              </div>
              <div className="flex items-center gap-2">
                {discountPercent > 0 && (
                  <span className="tag-clay tag-nokni rounded-full px-2 py-1 typo-label font-semibold">
                    {t('discountOff', { percent: discountPercent })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          {product.options.length > 0 && (
            <div ref={optionSectionRef} className="hidden md:block">
              <OptionSelector
                options={product.options}
                selectedOptionId={selectedOptionId}
                onSelect={setSelectedOptionId}
              />
            </div>
          )}

          {/* Quantity */}
          {renderQuantitySection('hidden md:flex')}

          {isSoldout && (
            <p className="typo-body-sm font-semibold text-destructive">
              {t('stockStatus.soldoutReason')}
            </p>
          )}

          {/* Action buttons — desktop only */}
          <div className="hidden gap-3 md:flex">
            <Button
              type="button"
              variant="gray"
              size="icon"
              onClick={() => void handleToggleWishlist()}
              disabled={isTogglingWishlist}
              aria-label={isWishlisted ? t('removeFromWishlistAria') : t('addToWishlistAria')}
              className={cn(
                'h-11 min-h-11 w-11 shrink-0 rounded-md',
                isWishlisted && 'text-primary',
              )}
            >
              <Heart className="h-5 w-5" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </Button>
            <Button
              variant="white"
              className="flex-1"
              disabled={isSoldout || isAdding || isBuying}
              onClick={() => void handleAddToCart()}
            >
              {t('addToCart')}
            </Button>
            <Button
              variant="black"
              className="flex-[2]"
              disabled={isSoldout || isAdding || isBuying}
              onClick={() => void handleBuyNow()}
            >
              {t('buyNow')}
            </Button>
          </div>


        </div>
      </div>

      {/* Tabs */}
      <div className="layout-container p-0">
        <ProductTabs
          description={product.description}
          descriptionImages={descriptionImages}
          productId={Number(product.id)}
          locale={locale}
          noticeInfo={product.noticeInfo}
        />
      </div>

      {/* Mobile fixed bottom action bar — sits above MobileBottomNav (z-50, ~56px tall) */}
      <div className={isNavVisible ? 'md:hidden fixed bottom-14 left-0 right-0 z-50 flex flex-col gap-3 bg-background px-4 py-3' : 'md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 bg-background px-4 py-3'}>
        {isMobilePurchasePanelOpen && (
          <div className="animate-fade-in-up">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsMobilePurchasePanelOpen(false)}
                aria-label={t('close')}
                className="h-10 min-h-10 w-full justify-end rounded-lg px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            {product.options.length > 0 && (
              <div ref={mobileOptionSectionRef}>
                <OptionSelector
                  options={product.options}
                  selectedOptionId={selectedOptionId}
                  onSelect={setSelectedOptionId}
                />
              </div>
            )}
            {renderQuantitySection('mt-3 flex')}
          </div>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="gray"
            size="icon"
            onClick={() => void handleToggleWishlist()}
            disabled={isTogglingWishlist}
            aria-label={isWishlisted ? t('removeFromWishlistAria') : t('addToWishlistAria')}
            className={cn(
              'h-11 min-h-11 w-11 shrink-0 rounded-md',
              isWishlisted && 'text-primary',
            )}
          >
            <Heart className="h-5 w-5" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </Button>
          <Button
            variant="white"
            className="w-1/3"
            disabled={isSoldout || isAdding || isBuying}
            onClick={() => void handleAddToCart()}
          >
            {t('addToCart')}
          </Button>
          <Button
            variant="black"
            className="w-2/3"
            disabled={isSoldout || isAdding || isBuying}
            aria-expanded={isMobilePurchasePanelOpen}
            onClick={() => void handleMobileBuyNow()}
          >
            {t('buyNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}
