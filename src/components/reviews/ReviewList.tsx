'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { reviewsApi } from '@/lib/api'
import type { ReviewItem, ReviewStats as ReviewStatsType, ReviewSort } from '@/lib/api'
import { cn } from '@/components/ui/utils'
import { handleApiError } from '@/utils/error'
import ReviewCard from './ReviewCard'
import ReviewStatsComponent from './ReviewStats'

interface ReviewListProps {
  productId: number
}

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'rating_high', label: '별점 높은순' },
  { value: 'rating_low', label: '별점 낮은순' },
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
  const [isLoading, setIsLoading] = useState(true)
  const limit = 20

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await reviewsApi.getByProduct(productId, { sort, page, limit })
      setReviews(res.data)
      setStats(res.stats)
      setTotal(res.pagination.total)
    } catch (err: unknown) {
      toast.error(handleApiError(err, '리뷰를 불러올 수 없습니다.'))
    } finally {
      setIsLoading(false)
    }
  }, [productId, sort, page])

  useEffect(() => {
    void fetchReviews()
  }, [fetchReviews])

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
            {opt.label}
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
          아직 리뷰가 없습니다.
        </p>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
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
