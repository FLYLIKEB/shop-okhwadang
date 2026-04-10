'use client';

import { cn } from '@/components/ui/utils';
import type { Collection } from '@/lib/api';

interface ClayTypeFilterProps {
  collections: Collection[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function ClayTypeFilter({ collections, selected, onSelect }: ClayTypeFilterProps) {
  return (
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
      {collections.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(selected === item.name ? undefined : item.name)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            selected === item.name
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground',
          )}
        >
          {item.nameKo ?? item.name}
        </button>
      ))}
    </div>
  );
}
