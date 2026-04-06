'use client';

import { cn } from '@/components/ui/utils';
import type { Collection } from '@/lib/api';

interface TeapotShapeFilterProps {
  collections: Collection[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function TeapotShapeFilter({ collections, selected, onSelect }: TeapotShapeFilterProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">모양</h2>
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="teapot-shape"
            checked={selected === undefined}
            onChange={() => onSelect(undefined)}
            className="h-4 w-4 border-border accent-primary"
          />
          <span className={cn(
            'text-sm transition-colors',
            selected === undefined ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}>
            전체
          </span>
        </label>
        {collections.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="teapot-shape"
              checked={selected === item.name}
              onChange={() => onSelect(item.name)}
              className="h-4 w-4 border-border accent-primary"
            />
            <span className={cn(
              'text-sm transition-colors',
              selected === item.name ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}>
              {item.nameKo ?? item.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
