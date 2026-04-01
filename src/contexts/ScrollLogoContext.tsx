'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface ScrollLogoContextValue {
  progress: number;
  isHeroVisible: boolean;
  heroLogoStyle: React.CSSProperties;
  headerLogoStyle: React.CSSProperties;
}

const ScrollLogoContext = createContext<ScrollLogoContextValue | null>(null);

interface ScrollLogoProviderProps {
  value: ScrollLogoContextValue;
  children: ReactNode;
}

export function ScrollLogoProvider({ value, children }: ScrollLogoProviderProps) {
  return (
    <ScrollLogoContext.Provider value={value}>
      {children}
    </ScrollLogoContext.Provider>
  );
}

export function useScrollLogoContext(): ScrollLogoContextValue | null {
  return useContext(ScrollLogoContext);
}
