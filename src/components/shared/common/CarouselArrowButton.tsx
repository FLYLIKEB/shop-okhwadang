'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

interface CarouselArrowButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export default function CarouselArrowButton({
  direction,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: CarouselArrowButtonProps) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex h-10 min-h-10 w-10 items-center justify-center rounded-full transition-colors',
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
