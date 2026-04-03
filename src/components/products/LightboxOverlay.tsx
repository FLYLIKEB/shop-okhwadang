'use client'

import Image from 'next/image'
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface LightboxOverlayProps {
  images: Array<{
    id: number
    url: string
    alt: string | null
    sortOrder: number
    isThumbnail: boolean
  }>
  selectedIndex: number
  onSelectIndex: (index: number) => void
  lightboxOpen: boolean
  lightboxZoomed: boolean
  setLightboxZoomed: (zoomed: boolean) => void
  lightboxPanRef: React.MutableRefObject<{ x: number; y: number }>
  lightboxImageStyle: React.CSSProperties
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  handleLightboxMouseDown: (e: React.MouseEvent) => void
  handleLightboxMouseMove: (e: React.MouseEvent) => void
  handleLightboxMouseUp: () => void
  handleLightboxTouchStart: (e: React.TouchEvent) => void
  handleLightboxTouchMove: (e: React.TouchEvent) => void
  handleLightboxTouchEnd: (e: React.TouchEvent) => void
  touchSwiped: React.MutableRefObject<boolean>
  isDragging: React.MutableRefObject<boolean>
}

export default function LightboxOverlay({
  images,
  selectedIndex,
  onSelectIndex,
  lightboxOpen,
  lightboxZoomed,
  setLightboxZoomed,
  lightboxPanRef,
  lightboxImageStyle,
  onClose,
  onPrev,
  onNext,
  handleLightboxMouseDown,
  handleLightboxMouseMove,
  handleLightboxMouseUp,
  handleLightboxTouchStart,
  handleLightboxTouchMove,
  handleLightboxTouchEnd,
  touchSwiped,
  isDragging,
}: LightboxOverlayProps) {
  if (!lightboxOpen) return null

  const selectedImage = images[selectedIndex]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-lightbox-in"
      onClick={onClose}
      onTouchStart={handleLightboxTouchStart}
      onTouchMove={handleLightboxTouchMove}
      onTouchEnd={handleLightboxTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-50"
        aria-label="닫기"
      >
        <X className="size-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          touchSwiped.current = false
          setLightboxZoomed(!lightboxZoomed)
          if (lightboxZoomed) {
            const resetPan = { x: 0, y: 0 }
            lightboxPanRef.current = resetPan
          }
        }}
        className={cn(
          'absolute right-16 top-4 rounded-full p-3 text-white transition-colors z-50',
          lightboxZoomed ? 'bg-white/30 hover:bg-white/40' : 'bg-white/10 hover:bg-white/20',
        )}
        aria-label={lightboxZoomed ? '축소' : '확대'}
      >
        {lightboxZoomed ? <ZoomOut className="size-6" /> : <ZoomIn className="size-6" />}
      </button>

      <div
        className="relative z-10 max-h-[85vh] max-w-[90vw]"
        onClick={(e) => {
          e.stopPropagation()
          if (!touchSwiped.current && !isDragging.current) {
            if (lightboxZoomed) {
                const resetPan = { x: 0, y: 0 }
                lightboxPanRef.current = resetPan
              }
              setLightboxZoomed(!lightboxZoomed)
          }
        }}
        onMouseDown={handleLightboxMouseDown}
        onMouseMove={handleLightboxMouseMove}
        onMouseUp={handleLightboxMouseUp}
        onMouseLeave={handleLightboxMouseUp}
        style={{ cursor: lightboxZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <div
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

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              touchSwiped.current = false
              onPrev()
            }}
            className="absolute left-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              touchSwiped.current = false
              onNext()
            }}
            className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
            aria-label="다음 이미지"
          >
            <ChevronRight className="size-8" />
          </button>
        </>
      )}

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm z-50">
        {selectedIndex + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                touchSwiped.current = false
                onSelectIndex(i)
              }}
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
  )
}
