'use client'

import type { ReviewStats as ReviewStatsType } from '@/lib/api'
import StarRating from './StarRating'

interface ReviewStatsProps {
  stats: ReviewStatsType
}

export default function ReviewStats({ stats }: ReviewStatsProps) {
  const maxCount = Math.max(...Object.values(stats.distribution), 1)

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border p-4 sm:flex-row sm:gap-8">
      {/* Average rating */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-4xl font-bold text-foreground">
          {stats.averageRating.toFixed(1)}
        </span>
        <StarRating rating={Math.round(stats.averageRating)} size="md" />
        <span className="text-xs text-muted-foreground">
          {stats.totalCount}개 리뷰
        </span>
      </div>

      {/* Distribution */}
      <div className="flex flex-1 flex-col gap-1.5 w-full">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[String(star)] ?? 0
          const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-right text-muted-foreground">{star}점</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
