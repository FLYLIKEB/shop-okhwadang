'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/components/ui/utils'
import StarRating from '@/components/shared/reviews/StarRating'

interface ProductRatingSummaryProps {
  rating?: number
  reviewCount?: number
  className?: string
}

export default function ProductRatingSummary({
  rating,
  reviewCount,
  className,
}: ProductRatingSummaryProps) {
  const t = useTranslations('product')

  if (rating === undefined || reviewCount === undefined || reviewCount <= 0) {
    return null
  }

  return (
    <div className={cn('inline-flex shrink-0 items-center gap-1.5', className)}>
      <StarRating rating={rating} maxRating={1} size="sm" interactive={false} />
      <span className="typo-body-sm font-medium text-muted-foreground">
        {t('ratingSummary', { rating: rating.toFixed(1), count: reviewCount })}
      </span>
    </div>
  )
}
