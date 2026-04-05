'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/utils';

interface PriceRangeFilterProps {
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
}

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
}

export default function PriceRangeFilter({ min, max, onChange }: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState(min !== undefined ? String(min) : '');
  const [localMax, setLocalMax] = useState(max !== undefined ? String(max) : '');

  const handleApply = () => {
    const minNum = localMin !== '' ? Number(localMin) : undefined;
    const maxNum = localMax !== '' ? Number(localMax) : undefined;

    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
      onChange(maxNum, minNum);
      setLocalMin(String(maxNum));
      setLocalMax(String(minNum));
    } else {
      onChange(minNum, maxNum);
    }
  };

  const inputClass = cn(
    'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-ring',
  );

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="최소 가격"
            placeholder="최소"
            min={0}
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            className={inputClass}
          />
          <span className="shrink-0 text-sm text-muted-foreground">~</span>
          <input
            type="number"
            aria-label="최대 가격"
            placeholder="최대"
            min={0}
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            className={inputClass}
          />
        </div>
        {(min !== undefined || max !== undefined) && (
          <p className="text-xs text-muted-foreground">
            {min !== undefined && max !== undefined
              ? `${formatKRW(min)} ~ ${formatKRW(max)}`
              : min !== undefined
                ? `${formatKRW(min)} 이상`
                : `${formatKRW(max!)} 이하`}
          </p>
        )}
        <button
          type="button"
          onClick={handleApply}
          className={cn(
            'w-full rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground',
            'transition-colors hover:bg-primary/90',
          )}
        >
          적용
        </button>
      </div>
    </div>
  );
}
