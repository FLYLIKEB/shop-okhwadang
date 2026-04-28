'use client'

import { useState, memo } from 'react'
import Image from 'next/image'
import type { ReviewItem } from '@/lib/api'
import StarRating from './StarRating'

interface ReviewCardProps {
  review: ReviewItem
}

const ReviewCardComponent = memo(function ReviewCard({ review }: ReviewCardProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const formattedDate = new Date(review.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isSmartStoreReview = review.source === 'smartstore'

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          <span className="text-sm font-medium text-foreground">{review.userName}</span>
          {isSmartStoreReview && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
              네이버 스마트스토어
            </span>
          )}
        </div>
        <time className="text-xs text-muted-foreground">{formattedDate}</time>
      </div>

      {review.content && (
        <p className="mt-2 text-sm text-foreground leading-relaxed">{review.content}</p>
      )}

      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.imageUrls.map((url, idx) => (
            <button
              key={url}
              type="button"
              className="shrink-0 overflow-hidden rounded-md border border-border"
              onClick={() => setExpandedImage(url)}
              aria-label={`리뷰 이미지 ${idx + 1}`}
            >
              <Image
                src={url}
                alt={`리뷰 이미지 ${idx + 1}`}
                width={80}
                height={80}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setExpandedImage(null)}
          role="dialog"
          aria-label="이미지 확대"
        >
          <Image
            src={expandedImage}
            alt="확대 이미지"
            width={1200}
            height={900}
            className="max-h-[80svh] max-w-[90svw] rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  )
})

export default ReviewCardComponent
