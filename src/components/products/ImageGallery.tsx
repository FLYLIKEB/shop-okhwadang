'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { TEAPOT_IMAGES } from '@/lib/teapot-images'

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
}

export default function ImageGallery({ images: rawImages }: ImageGalleryProps) {
  const images = rawImages.length > 0 ? rawImages : FALLBACK_IMAGES
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxZoomed, setLightboxZoomed] = useState(false)
  const mainImageRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const rafId = useRef<number>(0)

  const selectedImage = images[selectedIndex]

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setSelectedIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') { setLightboxOpen(false); setLightboxZoomed(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goPrev, goNext])

  useEffect(() => () => cancelAnimationFrame(rafId.current), [])

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev()
    touchStartX.current = null
  }, [goNext, goPrev])

  const imageStyle = useMemo(
    () => isZoomed
      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
      : { transformOrigin: 'center center' },
    [isZoomed, zoomPos.x, zoomPos.y],
  )

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setLightboxZoomed(false)
  }, [])

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <span className="text-sm">이미지 없음</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* 메인 이미지 */}
        <div
          ref={mainImageRef}
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted cursor-zoom-in group"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setLightboxOpen(true)}
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
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-0 top-0 h-full w-16 flex items-center justify-center z-10"
                style={{ background: 'transparent' }}
                aria-label="이전 이미지"
              >
                <span className="flex items-center justify-center w-10 h-20 rounded-md bg-black/40 text-white text-2xl font-bold shadow hover:bg-black/60 transition-colors">
                  ‹
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-0 top-0 h-full w-16 flex items-center justify-center z-10"
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

        {/* 썸네일 */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative aspect-square w-16 flex-shrink-0 overflow-hidden rounded-md border-2 bg-muted transition-all',
                  index === selectedIndex
                    ? 'ring-2 ring-primary border-transparent'
                    : 'border-transparent hover:border-border',
                )}
                aria-label={`이미지 ${index + 1} 선택`}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? `상품 이미지 ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors z-50"
            aria-label="닫기"
          >
            <X className="size-6" />
          </button>

          {/* 줌 토글 */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxZoomed((z) => !z) }}
            className="absolute right-16 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors z-50"
            aria-label={lightboxZoomed ? '축소' : '확대'}
          >
            {lightboxZoomed ? <ZoomOut className="size-6" /> : <ZoomIn className="size-6" />}
          </button>

          {/* 이미지 */}
          <div
            className="relative z-10"
            onClick={(e) => { e.stopPropagation(); setLightboxZoomed((z) => !z) }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={cn(
                'relative transition-transform duration-200',
                lightboxZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in',
              )}
              style={{ width: '80vw', height: '80vw', maxWidth: '80vw', maxHeight: '80vh' }}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt ?? '상품 이미지'}
                fill
                sizes="80vw"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* 화살표 */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20 transition-colors z-50"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20 transition-colors z-50"
                aria-label="다음 이미지"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}

          {/* dot 인디케이터 */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(i) }}
                  className={cn(
                    'size-2 rounded-full transition-all',
                    i === selectedIndex ? 'bg-white scale-125' : 'bg-white/40',
                  )}
                  aria-label={`이미지 ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}