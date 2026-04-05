'use client';

import { cn } from '@/components/ui/utils';

export type ClayType = '주니' | '단니' | '자니' | '흑니' | '청수니' | '녹니';

const CLAY_TYPES: { value: ClayType; label: string }[] = [
  { value: '주니', label: '주니(朱泥)' },
  { value: '단니', label: '단니(段泥)' },
  { value: '자니', label: '자니(紫泥)' },
  { value: '흑니', label: '흑니(黑泥)' },
  { value: '청수니', label: '청수니(靑水泥)' },
  { value: '녹니', label: '녹니(綠泥)' },
];

interface ClayTypeFilterProps {
  selected: ClayType | undefined;
  onSelect: (value: ClayType | undefined) => void;
}

export default function ClayTypeFilter({ selected, onSelect }: ClayTypeFilterProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            selected === undefined
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground',
          )}
        >
          전체
        </button>
        {CLAY_TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(selected === item.value ? undefined : item.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selected === item.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
