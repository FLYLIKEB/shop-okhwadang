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
  tone?: 'primary' | 'inverted';
}

const SIZE_CLASS_MAP = {
  xs: 'px-3 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
} as const;

const RADIUS_CLASS_MAP = {
  full: 'rounded-full',
  md: 'rounded-md',
} as const;

const TONE_CLASS_MAP = {
  primary: {
    active: 'border-primary bg-primary text-primary-foreground',
    inactive: 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground',
  },
  inverted: {
    active: 'border-foreground bg-foreground text-background',
    inactive: 'border-input text-muted-foreground hover:bg-muted',
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
              'border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
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
