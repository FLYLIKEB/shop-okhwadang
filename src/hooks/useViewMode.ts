'use client';

import { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '@/utils/storage';

export type ViewMode = 'grid' | 'list';

export function useViewMode(key: string, defaultMode: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    const stored = getStorageItem<ViewMode | null>(key, null);
    if (stored === 'grid' || stored === 'list') {
      setMode(stored);
    }
  }, [key]);

  const updateMode = (newMode: ViewMode) => {
    setMode(newMode);
    setStorageItem(key, newMode);
  };

  return { mode, setMode: updateMode };
}
