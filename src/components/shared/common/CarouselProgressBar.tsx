'use client';

import { cn } from '@/components/ui/utils';

interface CarouselProgressBarProps {
  progress: number;
  className?: string;
}

export default function CarouselProgressBar({ progress, className }: CarouselProgressBarProps) {
  return (
    <div className={cn('relative h-0.5 bg-border/40', className)}>
      <div
        className="absolute left-0 w-1/3 h-1 -top-0.5 bg-foreground/70 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${progress * 200}%)` }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
