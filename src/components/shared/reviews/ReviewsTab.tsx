'use client'

import ReviewList from './ReviewList'

interface ReviewsTabProps {
  productId: number
}

export default function ReviewsTab({ productId }: ReviewsTabProps) {
  return <ReviewList productId={productId} />
}
