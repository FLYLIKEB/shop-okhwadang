'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import { useMediaQuery } from '@/components/shared/hooks/useMediaQuery'
import { useUrlQueryState } from '@/hooks/useUrlModal'
import { handleApiError } from '@/utils/error'
import { localMessage } from '@/utils/localMessages'
import type { Locale } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import LightboxOverlay from './LightboxOverlay'

interface ProductImage {
  id: number
  url: string
  alt: string | null
  sortOrder: number
  isThumbnail: boolean
}

interface ImageGalleryProps {
  images: ProductImage[]
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  locale?: Locale
}

function ImageGallerySkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-20 h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ImageGalleryError({ error, onRetry, locale }: { error: Error; onRetry?: () => void; locale: Locale }) {
  return (
    <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-1">{localMessage('product.imageLoadError', undefined, locale)}</p>
        <p className="text-xs text-muted-foreground">{handleApiError(error, localMessage('product.unknownImageError', undefined, locale))}</p>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="gray"
          size="sm"
          onClick={onRetry}
        >
          {localMessage('product.retry', undefined, locale)}
        </Button>
      )}
    </div>
  )
}

export default function ImageGallery({ images: rawImages, isLoading, error, onRetry, locale = 'ko' }: ImageGalleryProps) {
  const images = rawImages.length > 0 ? rawImages : []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const { value: lightboxParam, setValue: setLightboxParam, close: closeLightboxParam } = useUrlQueryState('lightbox')
  const lightboxOpen = lightboxParam !== null
  const mainImageRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number>(0)
  const isScrolling = useRef(false)
  const scrollTimeoutId = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [lightboxZoomed, setLightboxZoomed] = useState(false)
  const resetLightboxState = useCallback(() => setLightboxZoomed(false), [])

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    isScrolling.current = true
    clearTimeout(scrollTimeoutId.current)
    container.scrollTo({ left: container.offsetWidth * index, behavior: 'smooth' })
    scrollTimeoutId.current = setTimeout(() => { isScrolling.current = false }, 350)
  }, [])

  useEffect(() => {
    if (lightboxParam === null) {
      return
    }

    if (images.length === 0) {
      closeLightboxParam('replace')
      return
    }

    const parsedIndex = Number(lightboxParam)
    if (!Number.isInteger(parsedIndex)) {
      closeLightboxParam('replace')
      return
    }

    const safeIndex = Math.min(Math.max(parsedIndex, 0), Math.max(images.length - 1, 0))
    if (safeIndex !== parsedIndex) {
      setLightboxParam(String(safeIndex), 'replace')
      return
    }

    setSelectedIndex((prev) => (prev === safeIndex ? prev : safeIndex))
  }, [closeLightboxParam, images.length, lightboxParam, setLightboxParam])

  const goPrev = useCallback(() => {
    resetLightboxState()
    setSelectedIndex((i) => {
      const next = i === 0 ? images.length - 1 : i - 1
      scrollToIndex(next)
      if (lightboxOpen) setLightboxParam(String(next), 'replace')
      return next
    })
  }, [images.length, lightboxOpen, resetLightboxState, scrollToIndex, setLightboxParam])

  const goNext = useCallback(() => {
    resetLightboxState()
    setSelectedIndex((i) => {
      const next = i === images.length - 1 ? 0 : i + 1
      scrollToIndex(next)
      if (lightboxOpen) setLightboxParam(String(next), 'replace')
      return next
    })
  }, [images.length, lightboxOpen, resetLightboxState, scrollToIndex, setLightboxParam])

  // Sync selectedIndex from scroll position
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    let scrollRaf = 0
    function onScroll() {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = requestAnimationFrame(() => {
        if (isScrolling.current || !container) return
        const slideWidth = container.offsetWidth
        if (slideWidth === 0) return
        const newIndex = Math.round(container.scrollLeft / slideWidth)
        setSelectedIndex((prev) => (prev !== newIndex ? newIndex : prev))
      })
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(scrollRaf)
    }
  }, [])

  const closeLightbox = useCallback(() => {
    closeLightboxParam()
    resetLightboxState()
  }, [closeLightboxParam, resetLightboxState])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') {
        closeLightboxParam()
        resetLightboxState()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeLightboxParam, goPrev, goNext, lightboxOpen, resetLightboxState])

  useEffect(() => () => cancelAnimationFrame(rafId.current), [])

  useEffect(() => {
    if (!lightboxOpen) {
      resetLightboxState()
    }
  }, [lightboxOpen, resetLightboxState])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !mainImageRef.current) return
    const clientX = e.clientX
    const clientY = e.clientY
    cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (!mainImageRef.current) return
      const rect = mainImageRef.current.getBoundingClientRect()
      setZoomPos({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      })
    })
  }, [isZoomed])

  const imageStyle = useMemo(
    () => isZoomed
      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
      : { transformOrigin: 'center center' },
    [isZoomed, zoomPos.x, zoomPos.y],
  )


  if (isLoading) {
    return <ImageGallerySkeleton />
  }

  if (error) {
    return <ImageGalleryError error={error} onRetry={onRetry} locale={locale} />
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <svg className="w-10 h-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm text-muted-foreground">{localMessage('product.noImages', undefined, locale)}</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-lg bg-muted group">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide touch-auto"
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                ref={index === selectedIndex ? mainImageRef : undefined}
                className={cn('relative aspect-square w-full flex-shrink-0 snap-center overflow-hidden', canHover && 'cursor-zoom-in')}
                onMouseEnter={() => canHover && setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={index === selectedIndex ? handleMouseMove : undefined}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? localMessage('product.productImage', { index: index + 1 }, locale)}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={cn(
                    'object-cover transition-transform duration-200',
                    canHover && isZoomed && index === selectedIndex ? 'scale-150' : 'scale-100',
                  )}
                  style={index === selectedIndex ? imageStyle : undefined}
                  priority={index === 0}
                />
              </div>
            ))}
          </div>

          {images.length > 1 && [
            { label: 'galleryPrev', ariaLabel: 'prevImage', onClick: goPrev, position: 'left-2' },
            { label: 'galleryNext', ariaLabel: 'nextImage', onClick: goNext, position: 'right-2' },
          ].map(({ label, ariaLabel, onClick, position }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              onClick={onClick}
              aria-label={localMessage(`product.${ariaLabel}`, undefined, locale)}
              className={cn('absolute top-1/2 z-10 -translate-y-1/2 px-2 text-xs text-white mix-blend-difference hover:bg-transparent hover:text-white', position)}
            >
              {localMessage(`product.${label}`, undefined, locale)}
            </Button>
          ))}

          <Button
            type="button"
            variant="ghost"
            className="absolute bottom-2 right-2 z-10 px-2 text-xs text-white mix-blend-difference hover:bg-transparent hover:text-white"
            aria-label={localMessage('product.zoom', undefined, locale)}
            onClick={() => setLightboxParam(String(selectedIndex), 'push')}
          >
            {localMessage('product.zoom', undefined, locale)}
          </Button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'rounded-full transition-all',
                  i === selectedIndex ? 'size-1.5 bg-white' : 'size-1 bg-white/40',
                )}
              />
            ))}
          </div>

        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={localMessage('product.selectImage', { index: index + 1 }, locale)}
                aria-pressed={selectedIndex === index}
                className={cn(
                  'relative h-24 w-20 shrink-0 overflow-hidden border border-transparent bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  selectedIndex === index && 'border-foreground',
                )}
                onClick={() => {
                  setSelectedIndex(index)
                  scrollToIndex(index)
                }}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? localMessage('product.productImage', { index: index + 1 }, locale)}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <LightboxOverlay
        images={images}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        lightboxOpen={lightboxOpen}
        lightboxZoomed={lightboxZoomed}
        setLightboxZoomed={setLightboxZoomed}
        onClose={closeLightbox}
        onPrev={goPrev}
        onNext={goNext}
        locale={locale}
      />
    </>
  )
}
