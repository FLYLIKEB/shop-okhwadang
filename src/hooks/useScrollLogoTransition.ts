'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface ScrollLogoState {
  progress: number;
  isHeroVisible: boolean;
  heroLogoStyle: React.CSSProperties;
  headerLogoStyle: React.CSSProperties;
}

interface UseScrollLogoTransitionOptions {
  heroRef: React.RefObject<HTMLElement | null>;
}

interface CachedHeroRect {
  top: number;
  left: number;
  height: number;
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useScrollLogoTransition({
  heroRef,
}: UseScrollLogoTransitionOptions): ScrollLogoState {
  const [progress, setProgress] = useState(1);
  const [cachedRect, setCachedRect] = useState<CachedHeroRect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureRect = () => {
      const heroEl = heroRef.current;
      if (!heroEl) return;
      const rect = heroEl.getBoundingClientRect();
      setCachedRect({
        top: rect.top + window.scrollY,
        left: rect.left,
        height: rect.height,
      });
    };

    measureRect();

    const resizeObserver = new ResizeObserver(measureRect);
    if (heroRef.current) {
      resizeObserver.observe(heroRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [heroRef]);

  const transforms = useMemo(() => {
    if (!cachedRect) {
      return {
        progress,
        isHeroVisible: progress < 1,
        heroLogoStyle: {
          opacity: Math.max(0, 1 - progress),
          transform: 'none',
        } as React.CSSProperties,
        headerLogoStyle: { opacity: Math.min(1, progress) } as React.CSSProperties,
      };
    }

    const headerHeight = 56;
    const heroStartTop = cachedRect.top;
    const heroStartLeft = cachedRect.left;
    const heroStartScale = 1.2;
    const heroStartFontSize = 24;
    const headerFontSize = 20;

    const p = easeOutCubic(progress);

    const currentTop = lerp(heroStartTop, headerHeight / 2 - 10, p);
    const currentLeft = lerp(heroStartLeft, 16, p);
    const currentScale = lerp(heroStartScale, 1, p);
    const currentFontSize = lerp(heroStartFontSize, headerFontSize, p);

    const heroOpacity = progress < 0.1 ? 1 : Math.max(0, 1 - (progress - 0.1) / 0.4);
    const headerOpacity = progress > 0.3 ? Math.min(1, (progress - 0.3) / 0.4) : 0;

    return {
      progress,
      isHeroVisible: heroOpacity > 0,
      heroLogoStyle: {
        opacity: heroOpacity,
        transform: `translate(${currentLeft - heroStartLeft}px, ${currentTop - heroStartTop}px) scale(${currentScale})`,
        fontSize: `${currentFontSize}px`,
      } as React.CSSProperties,
      headerLogoStyle: {
        opacity: headerOpacity,
        transform: `translateY(${(1 - p) * -20}px)`,
      } as React.CSSProperties,
    };
  }, [progress, cachedRect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setProgress(0);
      return;
    }

    const handleScroll = () => {
      // Disable scroll transition on desktop (md+)
      if (window.innerWidth >= 768) {
        setProgress(0);
        return;
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const heroEl = heroRef.current;
        if (!heroEl) return;

        // getBoundingClientRect inside RAF is acceptable — not in the render path
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

  return {
    progress,
    isHeroVisible: transforms.isHeroVisible,
    heroLogoStyle: transforms.heroLogoStyle,
    headerLogoStyle: transforms.headerLogoStyle,
  };
}
