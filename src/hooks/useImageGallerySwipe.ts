'use client'

import { useRef, useCallback } from 'react'

interface UseImageGallerySwipeOptions {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  thumbnailRef?: React.RefObject<HTMLDivElement | null>
}

export function useImageGallerySwipe({
  onSwipeLeft,
  onSwipeRight,
  thumbnailRef,
}: UseImageGallerySwipeOptions) {
  const touchStartX = useRef<number | null>(null)
  const touchSwiped = useRef(false)
  const touchOnThumbnail = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchSwiped.current = false
    touchOnThumbnail.current = false
    const target = e.target as HTMLElement
    if (thumbnailRef?.current?.contains(target)) {
      touchOnThumbnail.current = true
    }
  }, [thumbnailRef])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50 && !touchOnThumbnail.current) {
      touchSwiped.current = true
      void (diff > 0 ? onSwipeLeft() : onSwipeRight())
    }
    touchStartX.current = null
  }, [onSwipeLeft, onSwipeRight])

  return {
    handleTouchStart,
    handleTouchEnd,
    touchSwiped,
  }
}
