'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { AttributeFilterOption } from '@/lib/attributeFilterOptions';

interface TeapotShapeFilterProps {
  options: AttributeFilterOption[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function TeapotShapeFilter({ options, selected, onSelect }: TeapotShapeFilterProps) {
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
      {options.map((item) => {
        const filterValue = item.value;
        return (
          <label key={item.value} className="flex cursor-pointer items-center gap-2">
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
              {item.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
