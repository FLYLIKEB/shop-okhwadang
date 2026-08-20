'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/components/ui/utils'
import { localMessage } from '@/utils/localMessages'
import type { Locale } from '@/utils/currency'


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
  setLightboxZoomed: React.Dispatch<React.SetStateAction<boolean>>
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
  isDragging: React.MutableRefObject<boolean>
  lightboxDragMovedRef: React.MutableRefObject<boolean>
  locale: Locale
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
  isDragging,
  lightboxDragMovedRef,
  locale,
}: LightboxOverlayProps) {
  if (!lightboxOpen) return null

  const selectedImage = images[selectedIndex]

  /* v8 ignore next -- defensive SSR guard for the body portal target */
  if (typeof document === 'undefined') return null

  return createPortal((
    <div
      className="product-lightbox-top-layer fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-lightbox-in"
      onClick={onClose}
      onTouchStart={handleLightboxTouchStart}
      onTouchMove={handleLightboxTouchMove}
      onTouchEnd={handleLightboxTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-50"
        aria-label={localMessage('product.close', undefined, locale)}
      >
        <X className="size-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
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
        aria-label={lightboxZoomed ? localMessage('product.zoomOut', undefined, locale) : localMessage('product.zoomIn', undefined, locale)}
      >
        {lightboxZoomed ? <ZoomOut className="size-6" /> : <ZoomIn className="size-6" />}
      </button>

      <div
        className="relative z-10 h-[85vh] w-[90vw] max-w-[90vw] touch-none select-none overflow-hidden"
        onClick={(e) => {
          e.stopPropagation()
          if (isDragging.current || lightboxDragMovedRef.current) {
            lightboxDragMovedRef.current = false
            return
          }
          if (lightboxZoomed) {
            lightboxPanRef.current = { x: 0, y: 0 }
          }
          setLightboxZoomed(!lightboxZoomed)
        }}
        onMouseDown={handleLightboxMouseDown}
        onMouseMove={handleLightboxMouseMove}
        onMouseUp={handleLightboxMouseUp}
        onMouseLeave={handleLightboxMouseUp}
        style={{ cursor: lightboxZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <div className="relative h-full w-full">
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt ?? localMessage('product.defaultImage', undefined, locale)}
            fill
            sizes="90vw"
            className="object-contain select-none"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
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
              onPrev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
            aria-label={localMessage('product.prevImage', undefined, locale)}
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-4 text-white transition-colors z-50 opacity-60 hover:opacity-100"
            aria-label={localMessage('product.nextImage', undefined, locale)}
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
                onSelectIndex(i)
              }}
              className={cn(
                'size-2 rounded-full transition-all',
                i === selectedIndex ? 'bg-white scale-125' : 'bg-white/40',
              )}
              aria-label={localMessage('product.imageDot', { index: i + 1 }, locale)}
            />
          ))}
        </div>
      )}
    </div>
  ), document.body)
}
