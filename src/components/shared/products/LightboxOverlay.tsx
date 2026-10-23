'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X } from 'lucide-react'
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
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  locale: Locale
}

export default function LightboxOverlay({
  images,
  selectedIndex,
  onSelectIndex,
  lightboxOpen,
  lightboxZoomed,
  setLightboxZoomed,
  onClose,
  onPrev,
  onNext,
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
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={localMessage('product.close', undefined, locale)}
      >
        <X className="size-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setLightboxZoomed(!lightboxZoomed)
        }}
        className="absolute bottom-4 right-4 min-h-11 px-2 text-xs text-white z-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={lightboxZoomed ? localMessage('product.zoomOut', undefined, locale) : localMessage('product.zoomIn', undefined, locale)}
      >
        {localMessage(lightboxZoomed ? 'product.zoomOut' : 'product.zoomIn', undefined, locale)}
      </button>

      <div
        className="relative z-10 h-[85vh] w-[90vw] max-w-[90vw] touch-auto select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
            style={{ transform: lightboxZoomed ? 'scale(1.5)' : 'scale(1)', transition: 'transform 0.2s ease-out' }}
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
            className="absolute left-4 top-1/2 -translate-y-1/2 min-h-11 px-2 text-xs text-white z-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={localMessage('product.prevImage', undefined, locale)}
          >
            {localMessage('product.galleryPrev', undefined, locale)}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 min-h-11 px-2 text-xs text-white z-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={localMessage('product.nextImage', undefined, locale)}
          >
            {localMessage('product.galleryNext', undefined, locale)}
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
                'size-2 rounded-full transition-all hover:scale-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
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
