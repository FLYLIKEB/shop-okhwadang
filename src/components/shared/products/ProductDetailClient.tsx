'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { Button } from '@/components/ui/button'
import PriceDisplay from '@/components/shared/common/PriceDisplay'
import type { CartItem, ProductDetail, ProductOption } from '@/lib/api'
import { wishlistApi } from '@/lib/api'
import { SESSION_KEYS } from '@/constants/storage'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useRecentlyViewed } from '@/components/shared/hooks/useRecentlyViewed'
import { cn } from '@/components/ui/utils'
import ImageGallery from './ImageGallery'
import OptionSelector from './OptionSelector'
import QuantitySelector from './QuantitySelector'
import ProductTabs from './ProductTabs'
import { ProductDescription, ProductGuides } from './ProductDetailContent'
import ProductRatingSummary from './ProductRatingSummary'
import { InlineHtmlText } from '@/components/shared/blocks/genericBlockUtils'
import { formatCurrency, productCartPricing, type Locale } from '@/utils/currency'

interface ProductDetailClientProps {
  product: ProductDetail
  locale?: Locale
  attributeDescriptions?: Record<number, string>
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
  locale: Locale = 'ko',
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

  const pricing = productCartPricing(product, locale, priceAdjustment)
  const { unitPrice } = pricing
  const subtotal = unitPrice * quantity

  if (
    availableStock < quantity ||
    !Number.isSafeInteger(unitPrice) ||
    unitPrice < 0 ||
    (pricing.unitPriceUsd != null && pricing.unitPriceUsd < 0) ||
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
    ...pricing,
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

export default function ProductDetailClient({ product, locale = 'ko', attributeDescriptions = {} }: ProductDetailClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('product')
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<number | null>(null)
  const optionSectionRef = useRef<HTMLDivElement>(null)
  const buyNowStartedRef = useRef(false)
  const viewedThumbnail = product.images.find((image) => image.isThumbnail) ?? product.images[0]

  useEffect(() => {
    addRecentlyViewed({
      id: Number(product.id),
      name: product.name,
      price: toFiniteNumber(product.price),
      salePrice: product.salePrice == null ? null : toFiniteNumber(product.salePrice),
      priceUsd: product.priceUsd, salePriceUsd: product.salePriceUsd, pricingKrwPerUsd: product.pricingKrwPerUsd,
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
  const pricing = productCartPricing(product, locale, optionPriceAdjustment)
  const { unitPrice } = pricing
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

  const { execute: buyNow, isLoading: isBuying } = useAsyncAction(
    async () => {
      if (buyNowStartedRef.current) return
      buyNowStartedRef.current = true
      try {
        const checkoutItem = buildBuyNowCheckoutItem(product, selectedOption, quantity, locale)
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
      optionSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          {formatCurrency(locale === 'en' && pricing.unitPriceUsd != null ? pricing.unitPriceUsd * quantity : totalPrice, locale, locale === 'en' && pricing.unitPriceUsd != null ? { currency: 'USD' } : { exchangeRate: product.pricingKrwPerUsd })}
        </span>
      </div>
    </div>
  )

  return (
    <div className="toss-product-detail editorial-product-detail pb-8">
      <div className="editorial-product-grid">
        <div className="editorial-product-gallery">
          <ImageGallery images={product.images} locale={locale} />
          {product.attributes && product.attributes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-2">
              {product.attributes.map((attr) => {
                const code = attr.attributeType?.code
                if (!code) return null
                const label = code === 'clay_type' ? t('clay') : code === 'teapot_shape' ? t('shape')
                  : (locale === 'ko' ? attr.attributeType?.nameKo : attr.attributeType?.nameEn) ?? attr.attributeType?.name
                return (
                  <div key={attr.id} className="min-w-0 max-w-full">
                    <Link
                      href={`/products?attrs=${code}:${encodeURIComponent(attr.value)}`}
                      locale={locale}
                      prefetch={false}
                      className="inline-block py-2 typo-body-sm font-normal text-foreground hover:underline underline-offset-4"
                    >
                      {label}: {attr.displayValue ?? attr.value}
                    </Link>
                    {attributeDescriptions[attr.id] && (
                      <InlineHtmlText html={attributeDescriptions[attr.id]} className="whitespace-pre-line break-words typo-body-sm leading-relaxed text-muted-foreground" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="editorial-product-purchase">
        <div className="toss-product-detail__info flex flex-col gap-4">
          {/* Breadcrumb */}
          {product.category && (
            <nav className="hidden typo-body-sm font-medium text-muted-foreground md:block">
              <Link href={`/products?categoryId=${product.category.id}`} locale={locale} className="hover:text-foreground transition-colors">
                {product.category.name}
              </Link>
            </nav>
          )}

          {/* Name */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 toss-product-detail__title font-body text-foreground">{product.name}</h1>
            <ProductRatingSummary
              rating={product.rating}
              reviewCount={product.reviewCount}
              className="rounded-full px-2.5 py-1"
            />
          </div>

          {product.shortDescription && (
            <p className="typo-body-sm leading-relaxed text-muted-foreground md:hidden">{product.shortDescription}</p>
          )}

          {/* Price */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="font-body text-foreground">
                <PriceDisplay priceUsd={product.priceUsd} salePriceUsd={product.salePriceUsd} pricingKrwPerUsd={product.pricingKrwPerUsd} price={normalizedPrice} salePrice={normalizedSalePrice} size="lg" locale={locale} />
              </div>
            </div>
          </div>

          {/* Options */}
          {product.options.length > 0 && (
            <div ref={optionSectionRef}>
              <OptionSelector
                options={product.options}
                pricingKrwPerUsd={product.pricingKrwPerUsd}
                selectedOptionId={selectedOptionId}
                onSelect={setSelectedOptionId}
              />
            </div>
          )}

          {/* Quantity */}
          {renderQuantitySection('flex')}

          {isSoldout && (
            <p className="typo-body-sm font-semibold text-destructive">
              {t('stockStatus.soldoutReason')}
            </p>
          )}

          {/* Shared inline purchase actions */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="black"
              className="w-full"
              disabled={isSoldout || isAdding || isBuying}
              onClick={() => void handleBuyNow()}
            >
              {t('buyNow')}
            </Button>
            <Button
              variant="white"
              className="w-full"
              disabled={isSoldout || isAdding || isBuying}
              onClick={() => void handleAddToCart()}
            >
              {t('addToCart')}
            </Button>
            <Button
              type="button"
              variant="gray"
              size="icon"
              onClick={() => void handleToggleWishlist()}
              disabled={isTogglingWishlist}
              aria-label={isWishlisted ? t('removeFromWishlistAria') : t('addToWishlistAria')}
              className={cn(
                'h-11 min-h-11 w-11 justify-self-end',
                isWishlisted && 'text-primary',
              )}
            >
              <Heart className="h-5 w-5" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </Button>
          </div>
          <nav className="flex justify-end gap-4 typo-body-sm" aria-label={t('tabs.navigationLabel')}>
            <a href="#product-tabpanel-reviews" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('tabs.reviews')} ({product.reviewCount ?? 0})</a>
            <a href="#product-tabpanel-inquiry" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('tabs.inquiry')}</a>
          </nav>
        </div>
        </div>
        <aside className="editorial-product-guide" aria-label={t('tabs.details')}>
          <div className="border-t border-foreground pt-3">
            <h2 className="mb-4 typo-body-sm font-medium">{t('tabs.details')}</h2>
            {product.shortDescription && <p className="hidden typo-body-sm leading-relaxed text-muted-foreground md:block">{product.shortDescription}</p>}
            <div className="editorial-product-description mt-4">
              <ProductDescription description={product.description} descriptionImages={descriptionImages} />
            </div>
          </div>
          <ProductGuides noticeInfo={product.noticeInfo} />
        </aside>
      </div>

      {/* Tabs */}
      <div className="editorial-product-community">
        <ProductTabs
          layout="sections"
          description={product.description}
          descriptionImages={descriptionImages}
          productId={Number(product.id)}
          locale={locale}
          noticeInfo={product.noticeInfo}
        />
      </div>

    </div>
  )
}
