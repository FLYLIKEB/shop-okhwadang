'use client'

import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import { localMessage } from '@/utils/localMessages'
import type { Locale } from '@/utils/currency'
import { Button } from '@/components/ui/button'

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
  locale: Locale
}

export default function ThumbnailStrip({
  images,
  selectedIndex,
  onSelectIndex,
  thumbnailRef,
  locale,
}: ThumbnailStripProps) {
  return (
    <div ref={thumbnailRef} className="relative">
      <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">
        {images.map((image, index) => (
          <Button
            key={image.id}
            type="button"
            variant={index === selectedIndex ? 'black' : 'gray'}
            size="icon"
            onClick={() => onSelectIndex(index)}
            className={cn('relative h-16 min-h-16 w-16 flex-shrink-0 overflow-hidden rounded-md p-0 transition-all', index === selectedIndex && 'ring-2 ring-primary')}
            aria-label={localMessage('product.selectImage', { index: index + 1 }, locale)}
          >
            <Image
              src={image.url}
              alt={image.alt ?? localMessage('product.productImage', { index: index + 1 }, locale)}
              fill
              sizes="64px"
              className="object-cover"
            />
          </Button>
        ))}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted/40 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted/40 to-transparent pointer-events-none" />
    </div>
  )
}
