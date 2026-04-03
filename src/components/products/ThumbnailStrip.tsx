'use client'

import Image from 'next/image'
import { cn } from '@/components/ui/utils'

interface ThumbnailStripProps {
  images: Array<{
    id: number
    url: string
    alt: string | null
    sortOrder: number
    isThumbnail: boolean
  }>
  selectedIndex: number
  onSelectIndex: (index: number) => void
  thumbnailRef: React.RefObject<HTMLDivElement | null>
}

export default function ThumbnailStrip({
  images,
  selectedIndex,
  onSelectIndex,
  thumbnailRef,
}: ThumbnailStripProps) {
  return (
    <div ref={thumbnailRef} className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onSelectIndex(index)}
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
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted/40 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted/40 to-transparent pointer-events-none" />
    </div>
  )
}
