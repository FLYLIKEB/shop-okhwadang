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
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 })
  const mainImageRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchSwiped = useRef(false)
  const touchOnThumbnail = useRef(false)
  const rafId = useRef<number>(0)
  const lightboxPanRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const lightboxImgRef = useRef<HTMLDivElement>(null)

  const selectedImage = images[selectedIndex]

  const goPrev = useCallback(() => {
    setLightboxZoomed(false)
    setLightboxPan({ x: 0, y: 0 })
    lightboxPanRef.current = { x: 0, y: 0 }
    setSelectedIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const goNext = useCallback(() => {
    setLightboxZoomed(false)
    setLightboxPan({ x: 0, y: 0 })
    lightboxPanRef.current = { x: 0, y: 0 }
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

  useEffect(() => {
    if (!lightboxOpen) {
      setLightboxZoomed(false)
      setLightboxPan({ x: 0, y: 0 })
      lightboxPanRef.current = { x: 0, y: 0 }
    }
  }, [lightboxOpen])

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
    touchSwiped.current = false
    touchOnThumbnail.current = false
    const target = e.target as HTMLElement
    if (thumbnailRef.current?.contains(target)) {
      touchOnThumbnail.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50 && !touchOnThumbnail.current) {
      touchSwiped.current = true
      diff > 0 ? goNext() : goPrev()
    }
    touchStartX.current = null
  }, [goNext, goPrev])

  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchSwiped.current = false
    if (lightboxZoomed) {
      isDragging.current = true
      dragStart.current = {
        x: e.touches[0].clientX - lightboxPanRef.current.x,
        y: e.touches[0].clientY - lightboxPanRef.current.y,
      }
    }
  }, [lightboxZoomed])

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !lightboxZoomed) return
    const maxPan = 100
    const newX = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientX - dragStart.current.x))
    const newY = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientY - dragStart.current.y))
    lightboxPanRef.current = { x: newX, y: newY }
    setLightboxPan({ x: newX, y: newY })
  }, [lightboxZoomed])

  const handleLightboxTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current !== null && !lightboxZoomed) {
      const diff = touchStartX.current - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) {
        touchSwiped.current = true
        diff > 0 ? goNext() : goPrev()
      }
    }
    touchStartX.current = null
    isDragging.current = false
  }, [lightboxZoomed, goNext, goPrev])

  const handleLightboxMouseDown = useCallback((e: React.MouseEvent) => {
    if (!lightboxZoomed) return
    isDragging.current = true
    dragStart.current = {
      x: e.clientX - lightboxPanRef.current.x,
      y: e.clientY - lightboxPanRef.current.y,
    }
  }, [lightboxZoomed])

  const handleLightboxMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !lightboxZoomed) return
    const maxPan = 150
    const newX = Math.min(maxPan, Math.max(-maxPan, e.clientX - dragStart.current.x))
    const newY = Math.min(maxPan, Math.max(-maxPan, e.clientY - dragStart.current.y))
    lightboxPanRef.current = { x: newX, y: newY }
    setLightboxPan({ x: newX, y: newY })
  }, [lightboxZoomed])

  const handleLightboxMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

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

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setLightboxZoomed(false)
    setLightboxPan({ x: 0, y: 0 })
    lightboxPanRef.current = { x: 0, y: 0 }
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

          {/* 이미지 위치 점 인디케이터 */}
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

          {/* 확대 힌트 */}
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
              {/* 이전 화살표 - 항상 약간 표시 */}
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
              {/* 다음 화살표 - 항상 약간 표시 */}
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

        {/* 썸네일 */}
        {images.length > 1 && (
          <div ref={thumbnailRef} className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
            {/* 좌측 스크롤 인디케이터 */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted/40 to-transparent pointer-events-none" />
            {/* 우측 스크롤 인디케이터 */}
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted/40 to-transparent pointer-events-none" />
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-lightbox-in"
          onClick={closeLightbox}
          onTouchStart={handleLightboxTouchStart}
          onTouchMove={handleLightboxTouchMove}
          onTouchEnd={handleLightboxTouchEnd}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-50"
            aria-label="닫기"
          >
            <X className="size-6" />
          </button>

          {/* 줌 토글 - 상태에 따라 배경색 변화 */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; setLightboxZoomed((z) => !z); if (lightboxZoomed) { setLightboxPan({ x: 0, y: 0 }); lightboxPanRef.current = { x: 0, y: 0 } } }}
            className={cn(
              'absolute right-16 top-4 rounded-full p-3 text-white transition-colors z-50',
              lightboxZoomed ? 'bg-white/30 hover:bg-white/40' : 'bg-white/10 hover:bg-white/20',
            )}
            aria-label={lightboxZoomed ? '축소' : '확대'}
          >
            {lightboxZoomed ? <ZoomOut className="size-6" /> : <ZoomIn className="size-6" />}
          </button>

          {/* 이미지 - 애니메이션 + aspect ratio */}
          <div
            className="relative z-10 max-h-[85vh] max-w-[90vw]"
            onClick={(e) => { e.stopPropagation(); if (!touchSwiped.current && !isDragging.current) { setLightboxZoomed((z) => { if (z) { setLightboxPan({ x: 0, y: 0 }); lightboxPanRef.current = { x: 0, y: 0 } }; return !z }) } }}
            onMouseDown={handleLightboxMouseDown}
            onMouseMove={handleLightboxMouseMove}
            onMouseUp={handleLightboxMouseUp}
            onMouseLeave={handleLightboxMouseUp}
            style={{ cursor: lightboxZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            <div
              ref={lightboxImgRef}
              className="relative transition-transform duration-200"
              style={{ width: '90vw', height: 'auto', maxHeight: '85vh', aspectRatio: 'auto' }}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt ?? '상품 이미지'}
                width={900}
                height={900}
                className="object-contain w-full h-full"
                style={lightboxImageStyle}
                priority
              />
            </div>
          </div>

          {/* 화살표 */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; goPrev() }}
                className="absolute left-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; goNext() }}
                className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
                aria-label="다음 이미지"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}

          {/* 이미지 카운터 */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm z-50">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* dot 인디케이터 */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); touchSwiped.current = false; setSelectedIndex(i) }}
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
