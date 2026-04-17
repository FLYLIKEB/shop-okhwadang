'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import type { ProductSort } from '@/lib/api';

const SORT_VALUES: { value: ProductSort; labelKey: 'latest' | 'priceAsc' | 'priceDesc' | 'popular' }[] = [
  { value: 'latest', labelKey: 'latest' },
  { value: 'price_asc', labelKey: 'priceAsc' },
  { value: 'price_desc', labelKey: 'priceDesc' },
  { value: 'popular', labelKey: 'popular' },
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('product.sort');
  const current = (searchParams.get('sort') as ProductSort) ?? 'latest';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    params.delete('page');
    router.push(`/products?${params.toString()}`);
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
