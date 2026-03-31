'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface LogoScrollValue {
  progress: number;
  setProgress: (p: number) => void;
}

const LogoScrollContext = createContext<LogoScrollValue>({ progress: 0, setProgress: () => {} });

export function useLogoScroll() {
  return useContext(LogoScrollContext);
}

interface ProviderProps {
  children: React.ReactNode;
}

export function LogoScrollProvider({ children }: ProviderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let enteredHero = false;

    const handleHeroVisibility = (e: Event) => {
      const { isPast } = (e as CustomEvent<{ isPast: boolean }>).detail;
      
      if (!isPast) {
        enteredHero = true;
        setProgress(1);
      } else {
        enteredHero = false;
        setProgress(2);
      }
    };
    document.addEventListener('hero-visibility', handleHeroVisibility);
    return () => document.removeEventListener('hero-visibility', handleHeroVisibility);
  }, []);

  return (
    <LogoScrollContext.Provider value={{ progress, setProgress }}>
      {children}
    </LogoScrollContext.Provider>
  );
}
