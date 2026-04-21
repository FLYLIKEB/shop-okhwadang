'use client';

import { cn } from '@/components/ui/utils';

interface CarouselProgressBarProps {
  progress: number;
  className?: string;
}

export default function CarouselProgressBar({ progress, className }: CarouselProgressBarProps) {
  return (
    <div className={cn('relative h-0.5 bg-border/40 overflow-hidden', className)}>
      <div
        className="absolute inset-y-0 left-0 w-1/3 bg-foreground/50 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${progress * 200}%)` }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
