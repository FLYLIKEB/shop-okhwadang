'use client';

import { useGlobalLoading } from '@/contexts/GlobalLoadingContext';

export default function GlobalLoadingBar() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 overflow-hidden">
      <div className="h-full w-1/3 animate-global-loading-bar rounded-r-full bg-primary" />
    </div>
  );
}
