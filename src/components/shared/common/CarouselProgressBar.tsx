'use client';

import { cn } from '@/components/ui/utils';

interface CarouselProgressBarProps {
  progress: number;
  className?: string;
}

export default function CarouselProgressBar({ progress, className }: CarouselProgressBarProps) {
  return (
    <div className={cn('relative h-px bg-border/40 overflow-hidden', className)}>
      <div
        className="absolute inset-y-0 left-0 bg-foreground/40 transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
