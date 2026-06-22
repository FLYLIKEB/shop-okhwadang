'use client'

import { useState, useEffect } from 'react'
import { reviewsApi } from '@/lib/api'
import type { ReviewItem, ReviewStats as ReviewStatsType, ReviewSort } from '@/lib/api'
import { cn } from '@/components/ui/utils'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import ReviewCard from './ReviewCard'
import ReviewStatsComponent from './ReviewStats'
import { localMessage } from '@/utils/localMessages'

interface ReviewListProps {
  productId: number
}

const SORT_OPTIONS: { value: ReviewSort; key: 'sortRecent' | 'sortRatingHigh' | 'sortRatingLow' }[] = [
  { value: 'recent', key: 'sortRecent' },
  { value: 'rating_high', key: 'sortRatingHigh' },
  { value: 'rating_low', key: 'sortRatingLow' },
]

export default function ReviewList({ productId }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [stats, setStats] = useState<ReviewStatsType>({
    averageRating: 0,
    totalCount: 0,
    distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  })
  const [sort, setSort] = useState<ReviewSort>('recent')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const { execute: fetchReviews, isLoading } = useAsyncAction(
    async () => {
      const res = await reviewsApi.getByProduct(productId, { sort, page, limit })
      setReviews(res.data)
      setStats(res.stats)
      setTotal(res.pagination.total)
    },
    { errorMessage: localMessage('review.submitError') },
  )

  useEffect(() => {
    void fetchReviews()
  }, [productId, sort, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <ReviewStatsComponent stats={stats} />

      {/* Sort */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setSort(opt.value); setPage(1) }}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors',
              sort === opt.value
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {localMessage(`review.${opt.key}`)}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {localMessage('review.noReviews')}
        </p>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard key={`${review.source ?? 'internal'}-${review.id}`} review={review} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
