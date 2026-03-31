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
    document.addEventListener('hero-visibility', handleHeroVisibility);
    return () => document.removeEventListener('hero-visibility', handleHeroVisibility);
  }, []);

  return (
    <LogoScrollContext.Provider value={{ progress }}>
      {children}
    </LogoScrollContext.Provider>
  );
}
