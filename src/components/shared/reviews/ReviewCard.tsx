'use client'

import { useState, memo } from 'react'
import Image from 'next/image'
import { reviewsApi } from '@/lib/api'
import type { ReviewItem } from '@/lib/api'
import StarRating from './StarRating'
import { getClientLocale } from '@/utils/clientLocale'
import { localMessage } from '@/utils/localMessages'

interface ReviewCardProps {
  review: ReviewItem
}

function detectReviewSourceLocale(content: string): 'ko' | 'en' {
  return /[\u3131-\u318E\uAC00-\uD7A3]/.test(content) ? 'ko' : 'en'
}

const ReviewCardComponent = memo(function ReviewCard({ review }: ReviewCardProps) {
  const locale = getClientLocale()
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [translatedContent, setTranslatedContent] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)

  const formattedDate = new Date(review.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isSmartStoreReview = review.source === 'smartstore'
  const content = review.content?.trim() ?? ''
  const sourceLocale = content ? detectReviewSourceLocale(content) : locale
  const canTranslate = Boolean(content) && sourceLocale !== locale
  const visibleContent = showTranslation && translatedContent ? translatedContent : review.content

  const handleTranslate = async () => {
    if (!content || !canTranslate) return

    if (translatedContent) {
      setShowTranslation((value) => !value)
      setTranslationError(null)
      return
    }

    setIsTranslating(true)
    setTranslationError(null)
    try {
      const result = await reviewsApi.translateContent({
        text: content,
        sourceLocale,
        targetLocale: locale,
      })
      setTranslatedContent(result.translatedText)
      setShowTranslation(true)
    } catch {
      setTranslationError(localMessage('review.translateError'))
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          <span className="text-sm font-medium text-foreground">{review.userName}</span>
          {isSmartStoreReview && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
              {localMessage('review.smartstore')}
            </span>
          )}
        </div>
        <time className="text-xs text-muted-foreground">{formattedDate}</time>
      </div>

      {review.content && (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <p className="text-sm text-foreground leading-relaxed">{visibleContent}</p>
            {canTranslate && (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:cursor-wait disabled:opacity-60"
              >
                {isTranslating
                  ? localMessage('review.translating')
                  : showTranslation
                    ? localMessage('review.showOriginal')
                    : localMessage('review.translate')}
              </button>
            )}
          </div>
          {showTranslation && translatedContent && (
            <p className="text-[11px] text-muted-foreground">{localMessage('review.machineTranslated')}</p>
          )}
          {translationError && (
            <p className="text-xs text-destructive">{translationError}</p>
          )}
        </div>
      )}

      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.imageUrls.map((url, idx) => (
            <button
              key={url}
              type="button"
              className="shrink-0 overflow-hidden rounded-md border border-border"
              onClick={() => setExpandedImage(url)}
              aria-label={localMessage('review.imageAria', { index: idx + 1 })}
            >
              <Image
                src={url}
                alt={localMessage('review.imageAria', { index: idx + 1 })}
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
          aria-label={localMessage('review.expandImage')}
        >
          <Image
            src={expandedImage}
            alt={localMessage('review.expandedImageAlt')}
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
