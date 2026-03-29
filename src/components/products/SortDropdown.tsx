'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/components/ui/utils';
import type { ProductSort } from '@/lib/api';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'price_asc', label: '가격낮은순' },
  { value: 'price_desc', label: '가격높은순' },
  { value: 'popular', label: '인기순' },
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      aria-label="정렬 기준"
      className={cn(
        'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring',
      )}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
