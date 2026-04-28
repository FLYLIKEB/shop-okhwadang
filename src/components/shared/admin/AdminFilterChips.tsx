import SegmentedOptionGroup, { type SegmentedOptionItem } from '@/components/shared/ui/SegmentedOptionGroup';

interface AdminFilterChipsProps<T extends string | number> {
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

export function AdminFilterChips<T extends string | number>({
  items,
  value,
  onToggle,
  ariaLabel,
  className,
  itemClassName,
  size,
  radius,
  tone,
}: AdminFilterChipsProps<T>) {
  return (
    <SegmentedOptionGroup
      items={items}
      value={value}
      onToggle={onToggle}
      ariaLabel={ariaLabel}
      className={className}
      itemClassName={itemClassName}
      size={size}
      radius={radius}
      tone={tone}
    />
  );
}
