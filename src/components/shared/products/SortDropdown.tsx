'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import type { ProductSort } from '@/lib/api';

const SORT_VALUES: { value: ProductSort; labelKey: 'latest' | 'priceAsc' | 'priceDesc' | 'popular' }[] = [
  { value: 'latest', labelKey: 'latest' },
  { value: 'price_asc', labelKey: 'priceAsc' },
  { value: 'price_desc', labelKey: 'priceDesc' },
  { value: 'popular', labelKey: 'popular' },
];

export default function SortDropdown() {
  const t = useTranslations('product.sort');
  const { sort, updateQuery } = useCatalogQueryParams();
  const current = (sort as ProductSort) ?? 'latest';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateQuery({ sort: e.target.value });
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label={t('label')}
      className={cn(
        'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring',
      )}
    >
      {SORT_VALUES.map((option) => (
        <option key={option.value} value={option.value}>
          {t(option.labelKey)}
        </option>
      ))}
    </select>
  );
}
