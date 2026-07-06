'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { Collection } from '@/lib/api';
import { getCompactCollectionLabel } from '@/lib/collectionDisplay';
import { getCollectionFilterValue, uniqueCollectionsByFilterValue } from '@/lib/collectionFilters';

interface TeapotShapeFilterProps {
  collections: Collection[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function TeapotShapeFilter({ collections, selected, onSelect }: TeapotShapeFilterProps) {
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="teapot-shape"
          checked={selected === undefined}
          onChange={() => onSelect(undefined)}
          className={cn('h-4 w-4 border-border accent-primary')}
        />
        <span className={cn(
          'text-sm transition-colors',
          selected === undefined ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}>
          {tCommon('all')}
        </span>
      </label>
      {uniqueCollectionsByFilterValue(collections, 'teapot_shape').map((item) => {
        const filterValue = getCollectionFilterValue(item, 'teapot_shape');
        return (
          <label key={item.id} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="teapot-shape"
              checked={selected === filterValue}
              onChange={() => onSelect(filterValue)}
              className="h-4 w-4 border-border accent-primary"
            />
            <span className={cn(
              'text-sm transition-colors',
              selected === filterValue ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}>
              {getCompactCollectionLabel(item)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
