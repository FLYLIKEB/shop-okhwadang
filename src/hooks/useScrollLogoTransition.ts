'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollLogoState {
  progress: number;
  isHeroVisible: boolean;
  heroLogoStyle: React.CSSProperties;
  headerLogoStyle: React.CSSProperties;
}

interface UseScrollLogoTransitionOptions {
  heroRef: React.RefObject<HTMLElement | null>;
}

export function useScrollLogoTransition({
  heroRef,
}: UseScrollLogoTransitionOptions): ScrollLogoState {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const calculateTransforms = useCallback(
    (scrollProgress: number) => {
      const heroRect = heroRef.current?.getBoundingClientRect();
      if (!heroRect) {
        return {
          progress: scrollProgress,
          isHeroVisible: scrollProgress < 1,
          heroLogoStyle: { opacity: Math.max(0, 1 - scrollProgress) },
          headerLogoStyle: { opacity: Math.min(1, scrollProgress) },
        };
      }

      const headerHeight = 56;
      const heroStartTop = heroRect.top;
      const heroStartLeft = heroRect.left;
      const heroStartScale = 1.2;
      const heroStartFontSize = 24;
      const headerFontSize = 20;

      const p = easeOutCubic(scrollProgress);

      const currentTop = lerp(heroStartTop, headerHeight / 2 - 10, p);
      const currentLeft = lerp(heroStartLeft, 16, p);
      const currentScale = lerp(heroStartScale, 1, p);
      const currentFontSize = lerp(heroStartFontSize, headerFontSize, p);

      const heroOpacity = scrollProgress < 0.1 ? 1 : Math.max(0, 1 - (scrollProgress - 0.1) / 0.4);
      const headerOpacity = scrollProgress > 0.3 ? Math.min(1, (scrollProgress - 0.3) / 0.4) : 0;

      return {
        progress: scrollProgress,
        isHeroVisible: heroOpacity > 0,
        heroLogoStyle: {
          opacity: heroOpacity,
          transform: `translate(${currentLeft - heroStartLeft}px, ${currentTop - heroStartTop}px) scale(${currentScale})`,
          fontSize: `${currentFontSize}px`,
        },
        headerLogoStyle: {
          opacity: headerOpacity,
          transform: `translateY(${(1 - p) * -20}px)`,
        },
      };
    },
    [heroRef]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setProgress(0);
      return;
    }

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const heroEl = heroRef.current;
        if (!heroEl) return;

        const heroRect = heroEl.getBoundingClientRect();

        const viewportHeight = window.innerHeight;
        const heroHeight = heroRect.height;

        let newProgress = 0;
        if (heroRect.bottom < viewportHeight * 0.5) {
          newProgress = 1;
        } else if (heroRect.top < viewportHeight) {
          const scrollableDistance = heroHeight - viewportHeight * 0.5;
          const scrolled = viewportHeight * 0.5 - heroRect.top;
          newProgress = Math.min(1, Math.max(0, scrolled / scrollableDistance));
        }

        setProgress(newProgress);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [heroRef]);

  const transforms = calculateTransforms(progress);

  return {
    progress,
    isHeroVisible: transforms.isHeroVisible,
    heroLogoStyle: transforms.heroLogoStyle,
    headerLogoStyle: transforms.headerLogoStyle,
  };
}
