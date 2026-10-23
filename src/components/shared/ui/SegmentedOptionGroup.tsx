'use client';

import { cn } from '@/components/ui/utils';

export interface SegmentedOptionItem<T extends string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface SegmentedOptionGroupProps<T extends string | number> {
  items: readonly SegmentedOptionItem<T>[];
  value: T | readonly T[] | null | undefined;
  onToggle: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  itemClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  radius?: 'full' | 'md';
  tone?: 'primary' | 'inverted' | 'text';
}

const SIZE_CLASS_MAP = {
  xs: 'min-h-9 px-3 py-1 typo-label',
  sm: 'min-h-10 px-3 py-1.5 typo-body-sm',
  md: 'min-h-11 px-4 py-2 typo-body-sm',
} as const;

const RADIUS_CLASS_MAP = {
  full: 'rounded-full',
  md: 'rounded-md',
} as const;

const TONE_CLASS_MAP = {
  text: {
    active: 'border-transparent bg-transparent text-foreground underline underline-offset-8 enabled:hover:text-muted-foreground',
    inactive: 'border-transparent bg-transparent text-foreground enabled:hover:underline enabled:hover:underline-offset-8',
  },
  primary: {
    active: 'border-foreground bg-foreground text-background shadow-sm enabled:hover:bg-foreground/80',
    inactive: 'border-transparent bg-muted text-muted-foreground enabled:hover:bg-muted/80 enabled:hover:text-foreground',
  },
  inverted: {
    active: 'border-foreground bg-foreground text-background enabled:hover:bg-foreground/80',
    inactive: 'border-input text-muted-foreground enabled:hover:bg-muted',
  },
} as const;

export default function SegmentedOptionGroup<T extends string | number>({
  items,
  value,
  onToggle,
  ariaLabel,
  className,
  itemClassName,
  size = 'sm',
  radius = 'full',
  tone = 'primary',
}: SegmentedOptionGroupProps<T>) {
  const isMultiValue = Array.isArray(value);

  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const isActive = isMultiValue ? value.includes(item.value) : value === item.value;

        return (
          <button
            key={String(item.value)}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(item.value)}
            disabled={item.disabled}
            className={cn(
              'border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
              SIZE_CLASS_MAP[size],
              RADIUS_CLASS_MAP[radius],
              isActive ? TONE_CLASS_MAP[tone].active : TONE_CLASS_MAP[tone].inactive,
              itemClassName,
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
