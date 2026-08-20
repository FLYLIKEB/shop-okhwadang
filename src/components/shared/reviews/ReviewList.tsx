'use client'

import { useState, useEffect } from 'react'
import { reviewsApi } from '@/lib/api'
import type { ReviewItem, ReviewStats as ReviewStatsType, ReviewSort } from '@/lib/api'

import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import ReviewCard from './ReviewCard'
import ReviewStatsComponent from './ReviewStats'
import { localMessage } from '@/utils/localMessages'
import { Button } from '@/components/ui/button'

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
  const updateReviewReply = (updatedReview: ReviewItem) => {
    setReviews((items) =>
      items.map((item) => {
        const itemSource = item.source ?? 'internal'
        const updatedSource = updatedReview.source ?? 'internal'
        return item.id === updatedReview.id && itemSource === updatedSource ? updatedReview : item
      }),
    )
  }

  return (
    <div className="space-y-6">
      <ReviewStatsComponent stats={stats} />

      {/* Sort */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={sort === opt.value ? 'black' : 'gray'}
            size="sm"
            onClick={() => { setSort(opt.value); setPage(1) }}
            className="rounded-full px-3 py-1 text-xs"
          >
            {localMessage(`review.${opt.key}`)}
          </Button>
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
            <ReviewCard
              key={`${review.source ?? 'internal'}-${review.id}`}
              review={review}
              onReplySaved={updateReviewReply}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="gray"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {localMessage('review.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="gray"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {localMessage('review.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
