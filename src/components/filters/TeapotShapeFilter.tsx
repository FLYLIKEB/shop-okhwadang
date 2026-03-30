'use client';

import { cn } from '@/components/ui/utils';

export type TeapotShape = '서시형' | '석표형' | '인왕형' | '덕종형' | '수평형';

const TEAPOT_SHAPES: { value: TeapotShape; label: string }[] = [
  { value: '서시형', label: '서시형(西施)' },
  { value: '석표형', label: '석표형(石瓢)' },
  { value: '인왕형', label: '인왕형(仁王)' },
  { value: '덕종형', label: '덕종형(德鐘)' },
  { value: '수평형', label: '수평형(水平)' },
];

interface TeapotShapeFilterProps {
  selected: TeapotShape | undefined;
  onSelect: (value: TeapotShape | undefined) => void;
}

export default function TeapotShapeFilter({ selected, onSelect }: TeapotShapeFilterProps) {
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
            className={cn(
              'h-4 w-4 border-border accent-primary',
            )}
          />
          <span className={cn(
            'text-sm transition-colors',
            selected === undefined ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}>
            전체
          </span>
        </label>
        {TEAPOT_SHAPES.map((item) => (
          <label key={item.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="teapot-shape"
              checked={selected === item.value}
              onChange={() => onSelect(item.value)}
              className="h-4 w-4 border-border accent-primary"
            />
            <span className={cn(
              'text-sm transition-colors',
              selected === item.value ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
