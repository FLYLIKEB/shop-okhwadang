'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GLOBAL_LOADING_END_EVENT, GLOBAL_LOADING_START_EVENT } from '@/constants/global-loading';

interface GlobalLoadingContextValue {
  pendingCount: number;
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const FALLBACK_CONTEXT: GlobalLoadingContextValue = {
  pendingCount: 0,
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export function GlobalLoadingProvider({ children }: GlobalLoadingProviderProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleStart = () => setPendingCount((prev) => prev + 1);
    const handleEnd = () => setPendingCount((prev) => Math.max(0, prev - 1));

    window.addEventListener(GLOBAL_LOADING_START_EVENT, handleStart);
    window.addEventListener(GLOBAL_LOADING_END_EVENT, handleEnd);

    return () => {
      window.removeEventListener(GLOBAL_LOADING_START_EVENT, handleStart);
      window.removeEventListener(GLOBAL_LOADING_END_EVENT, handleEnd);
    };
  }, []);

  const startLoading = useCallback(() => {
    setPendingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setPendingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const value = useMemo<GlobalLoadingContextValue>(() => ({
    pendingCount,
    isLoading: pendingCount > 0,
    startLoading,
    stopLoading,
  }), [pendingCount, startLoading, stopLoading]);

  return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>;
}

export function useGlobalLoading(): GlobalLoadingContextValue {
  const context = useContext(GlobalLoadingContext);
  return context ?? FALLBACK_CONTEXT;
}
