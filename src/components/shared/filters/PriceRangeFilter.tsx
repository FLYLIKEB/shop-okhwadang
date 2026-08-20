'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { formatCurrency } from '@/utils/currency';
import { getClientLocale } from '@/utils/clientLocale';
import { localMessage } from '@/utils/localMessages';

interface PriceRangeFilterProps {
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
}

export default function PriceRangeFilter({ min, max, onChange }: PriceRangeFilterProps) {
  const locale = getClientLocale();
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
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
    'min-h-11 w-full rounded-full bg-muted px-4 py-2 typo-body-sm',
    'focus:outline-none focus:ring-2 focus:ring-ring',
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          aria-label={t('priceMin')}
          placeholder={t('priceMin')}
          min={0}
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          className={inputClass}
        />
        <span className="shrink-0 typo-body-sm text-muted-foreground">~</span>
        <input
          type="number"
          aria-label={t('priceMax')}
          placeholder={t('priceMax')}
          min={0}
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          className={inputClass}
        />
      </div>
      {(min !== undefined || max !== undefined) && (
        <p className="typo-label text-muted-foreground">
          {min !== undefined && max !== undefined
            ? `${formatCurrency(min, locale)} ~ ${formatCurrency(max, locale)}`
            : min !== undefined
              ? localMessage('filters.priceMinOrMore', { amount: formatCurrency(min, locale) })
              : localMessage('filters.priceMaxOrLess', { amount: formatCurrency(max!, locale) })}
        </p>
      )}
      <button
        type="button"
        onClick={handleApply}
        className={cn(
          'min-h-11 w-full rounded-full bg-foreground px-4 py-2 typo-body-sm font-medium text-background',
          'transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {tCommon('apply')}
      </button>
    </div>
  );
}
