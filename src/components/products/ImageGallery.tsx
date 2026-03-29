'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductImage {
  id: number
  url: string
  alt: string | null
  sortOrder: number
  isThumbnail: boolean
}

interface ImageGalleryProps {
  images: ProductImage[]
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxZoomed, setLightboxZoomed] = useState(false)
  const mainImageRef = useRef<HTMLDivElement>(null)

  // 터치 스와이프
  const touchStartX = useRef<number | null>(null)

  const selectedImage = images[selectedIndex]

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setSelectedIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  // 키보드 내비게이션
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goPrev, goNext])

  // 마우스 줌 위치 추적
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isZoomed || !mainImageRef.current) return
    const rect = mainImageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  function handleMouseEnter() {
    setIsZoomed(true)
  }

  function handleMouseLeave() {
    setIsZoomed(false)
    setZoomPos({ x: 50, y: 50 })
  }

  // 터치 스와이프
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev()
    }
    touchStartX.current = null
  }

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
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
            style={
              isZoomed
                ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                : { transformOrigin: 'center center' }
            }
            priority
          />

          {/* 줌 힌트 오버레이 */}
          <div
            className={cn(
              'absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200',
              isZoomed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <ZoomIn className="size-3" />
              확대
            </span>
          </div>

          {/* 이미지가 여러 장일 때 화살표 */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="다음 이미지"
              >
                <ChevronRight className="size-4" />
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
        <>
          {/* 배경 — 클릭하면 닫힘 */}
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
            onClick={() => { setLightboxOpen(false); setLightboxZoomed(false) }}
            aria-hidden="true"
          />

          {/* 컨트롤 레이어 — 배경 위, 이미지 위 */}
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* 닫기 */}
            <button
              type="button"
              onClick={() => { setLightboxOpen(false); setLightboxZoomed(false) }}
              className="pointer-events-auto absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="닫기"
            >
              <X className="size-5" />
            </button>

            {/* 줌 토글 */}
            <button
              type="button"
              onClick={() => setLightboxZoomed((z) => !z)}
              className="pointer-events-auto absolute right-14 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label={lightboxZoomed ? '축소' : '확대'}
            >
              {lightboxZoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>

            {/* 화살표 */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}

            {/* dot 인디케이터 */}
            {images.length > 1 && (
              <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      'size-1.5 rounded-full transition-all',
                      i === selectedIndex ? 'bg-white scale-125' : 'bg-white/40',
                    )}
                    aria-label={`이미지 ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 이미지 — 배경 위, 컨트롤 아래 */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className={cn(
                'relative max-h-[80vh] max-w-[80vw] aspect-square overflow-hidden pointer-events-auto transition-transform duration-200',
                lightboxZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in scale-100',
              )}
              onClick={() => setLightboxZoomed((z) => !z)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
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
        </>
      )}
    </>
  )
}
