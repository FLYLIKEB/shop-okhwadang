'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'

interface ImageGalleryProps {
  images: Array<{ id: number; url: string; alt: string | null; sortOrder: number; isThumbnail: boolean }>
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <span className="text-sm">이미지 없음</span>
      </div>
    )
  }

  const selectedImage = images[selectedIndex]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={selectedImage.url}
          alt={selectedImage.alt ?? '상품 이미지'}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
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
  )
}
