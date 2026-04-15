'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface LogoScrollValue {
  progress: number;
}

const LogoScrollContext = createContext<LogoScrollValue>({ progress: 0 });

export function useLogoScroll() {
  return useContext(LogoScrollContext);
}

interface ProviderProps {
  children: React.ReactNode;
}

export function LogoScrollProvider({ children }: ProviderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let hasEnteredHero = false;

    const handleHeroVisibility = (e: Event) => {
      const { isPast } = (e as CustomEvent<{ isPast: boolean }>).detail;
      
      if (!isPast) {
        if (!hasEnteredHero) {
          hasEnteredHero = true;
          setProgress(1);
        }
      } else {
        if (hasEnteredHero) {
          hasEnteredHero = false;
          setProgress(2);
        }
      }
    };

    const handleScroll = () => {
      if (window.scrollY === 0) {
        hasEnteredHero = true;
        setProgress(1);
      }
    };

    document.addEventListener('hero-visibility', handleHeroVisibility);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Trigger a scroll event so HeroBannerBlock re-dispatches hero-visibility
    // after this listener is registered (fixes race condition on back-navigation).
    // setTimeout 0 ensures HeroBannerBlock's scroll listener is registered first.
    const t = setTimeout(() => window.dispatchEvent(new Event('scroll')), 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener('hero-visibility', handleHeroVisibility);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <LogoScrollContext.Provider value={{ progress }}>
      {children}
    </LogoScrollContext.Provider>
  );
}
