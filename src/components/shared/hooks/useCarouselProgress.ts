'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCarouselProgressOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

interface UseCarouselProgressResult {
  progress: number;
  updateProgress: () => void;
}

export function useCarouselProgress({ scrollRef }: UseCarouselProgressOptions): UseCarouselProgressResult {
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateProgress();
    el.addEventListener('scroll', updateProgress, { passive: true });
    const ro = new ResizeObserver(updateProgress);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateProgress);
      ro.disconnect();
    };
  // scrollRef.current가 바뀔 때도 재등록
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef.current, updateProgress]);

  return { progress, updateProgress };
}
