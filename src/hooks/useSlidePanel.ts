'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseSlidePanelOptions {
  duration?: number;
}

export function useSlidePanel(isOpen: boolean, { duration = 300 }: UseSlidePanelOptions = {}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  return { mounted, visible, close };
}
