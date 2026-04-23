'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Tracks window scroll state and publishes the header's bottom offset as the
 * `--header-bottom` CSS variable so floating panels (e.g. desktop dropdowns)
 * can align with the sticky header regardless of height changes.
 */
export function useHeaderScroll(headerRef: RefObject<HTMLElement | null>) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty('--header-bottom', `${el.getBoundingClientRect().bottom}px`);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headerRef]);

  return { isScrolled };
}
