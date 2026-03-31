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
    const handleHeroVisibility = (e: Event) => {
      const { isPast } = (e as CustomEvent<{ isPast: boolean }>).detail;
      setProgress(isPast ? 1 : 0);
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
