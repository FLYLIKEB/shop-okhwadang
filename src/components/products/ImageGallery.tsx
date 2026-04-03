'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import { ZoomIn } from 'lucide-react'
import { TEAPOT_IMAGES } from '@/lib/teapot-images'
import { useImageGallerySwipe } from '@/hooks/useImageGallerySwipe'
import { useLightboxInteraction } from '@/hooks/useLightboxInteraction'
import LightboxOverlay from './LightboxOverlay'
import ThumbnailStrip from './ThumbnailStrip'

interface ProductImage {
  id: number
  url: string
  alt: string | null
  sortOrder: number
  isThumbnail: boolean
}

const FALLBACK_IMAGES: ProductImage[] = TEAPOT_IMAGES.map((img, i) => ({
  id: -(i + 1),
  url: img.src,
  alt: img.alt,
  sortOrder: i,
  isThumbnail: i === 0,
}))

interface ImageGalleryProps {
  images: ProductImage[]
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
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

function ImageGalleryError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-1">이미지를 불러오지 못했습니다</p>
        <p className="text-xs text-muted-foreground">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export default function ImageGallery({ images: rawImages, isLoading, error, onRetry }: ImageGalleryProps) {
  const images = rawImages.length > 0 ? rawImages : FALLBACK_IMAGES
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const mainImageRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number>(0)
  const isDragging = useRef(false)

  const {
    lightboxZoomed,
    setLightboxZoomed,
    lightboxPan,
    lightboxPanRef,
    handleLightboxMouseDown,
    handleLightboxMouseMove,
    handleLightboxMouseUp,
    handleLightboxTouchStart,
    handleLightboxTouchMove,
    handleLightboxTouchEnd,
    resetLightboxState,
  } = useLightboxInteraction()

  const goPrev = useCallback(() => {
    resetLightboxState()
    setSelectedIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length, resetLightboxState])

  const goNext = useCallback(() => {
    resetLightboxState()
    setSelectedIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length, resetLightboxState])

  const { handleTouchStart, handleTouchEnd, touchSwiped } = useImageGallerySwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    thumbnailRef,
  })

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    resetLightboxState()
  }, [resetLightboxState])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') { setLightboxOpen(false); resetLightboxState() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goPrev, goNext, resetLightboxState])

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

  const lightboxImageStyle = useMemo(() => {
    if (!lightboxZoomed) return {}
    return {
      transform: `scale(1.5) translate(${lightboxPan.x}px, ${lightboxPan.y}px)`,
      transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
    }
  }, [lightboxZoomed, lightboxPan.x, lightboxPan.y])

  if (isLoading) {
    return <ImageGallerySkeleton />
  }

  if (error) {
    return <ImageGalleryError error={error} onRetry={onRetry} />
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <svg className="w-10 h-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm text-muted-foreground">등록된 이미지가 없습니다</span>
      </div>
    )
  }

  const selectedImage = images[selectedIndex]

  return (
    <>
      <div className="flex flex-col gap-3">
        <div
          ref={mainImageRef}
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted cursor-zoom-in group"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (!touchSwiped.current) setLightboxOpen(true) }}
          role="button"
          tabIndex={0}
          aria-label="이미지 확대해서 보기"
          onKeyDown={(e) => e.key === 'Enter' && setLightboxOpen(true)}
        >
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt ?? '상품 이미지'}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={cn(
              'object-cover transition-transform duration-200',
              isZoomed ? 'scale-150' : 'scale-100',
            )}
            style={imageStyle}
            priority
          />

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
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

          {!isZoomed && (
            <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
                <ZoomIn className="size-3" />
                확대
              </span>
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; goPrev() }}
                className="absolute left-0 top-0 h-full w-16 flex items-center justify-center z-10 opacity-40 hover:opacity-100 transition-opacity"
                style={{ background: 'transparent' }}
                aria-label="이전 이미지"
              >
                <span className="flex items-center justify-center w-10 h-20 rounded-md bg-black/40 text-white text-2xl font-bold shadow hover:bg-black/60 transition-colors">
                  ‹
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; goNext() }}
                className="absolute right-0 top-0 h-full w-16 flex items-center justify-center z-10 opacity-40 hover:opacity-100 transition-opacity"
                style={{ background: 'transparent' }}
                aria-label="다음 이미지"
              >
                <span className="flex items-center justify-center w-10 h-20 rounded-md bg-black/40 text-white text-2xl font-bold shadow hover:bg-black/60 transition-colors">
                  ›
                </span>
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <ThumbnailStrip
            images={images}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            thumbnailRef={thumbnailRef}
          />
        )}
      </div>

      <LightboxOverlay
        images={images}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        lightboxOpen={lightboxOpen}
        lightboxZoomed={lightboxZoomed}
        setLightboxZoomed={setLightboxZoomed}
        lightboxPanRef={lightboxPanRef}
        lightboxImageStyle={lightboxImageStyle}
        onClose={closeLightbox}
        onPrev={goPrev}
        onNext={goNext}
        handleLightboxMouseDown={handleLightboxMouseDown}
        handleLightboxMouseMove={handleLightboxMouseMove}
        handleLightboxMouseUp={handleLightboxMouseUp}
        handleLightboxTouchStart={handleLightboxTouchStart}
        handleLightboxTouchMove={handleLightboxTouchMove}
        handleLightboxTouchEnd={handleLightboxTouchEnd}
        touchSwiped={touchSwiped}
        isDragging={isDragging}
      />
    </>
  )
}
