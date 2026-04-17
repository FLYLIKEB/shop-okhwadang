'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import PriceRangeFilter from './PriceRangeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import type { Category, Collection } from '@/lib/api';

interface MobileFilterBarProps {
  categories: Category[];
  clayCollections: Collection[];
  shapeCollections: Collection[];
}

function parseAttrsParam(attrs: string | null): Map<string, string> {
  const result = new Map<string, string>();
  if (!attrs) return result;
  const pairs = attrs.split(',');
  for (const pair of pairs) {
    const [code, value] = pair.split(':');
    if (code && value) {
      result.set(code.trim(), value.trim());
    }
  }
  return result;
}

function buildAttrsParam(current: Map<string, string>, key: string, value: string | undefined): string | undefined {
  const next = new Map(current);
  if (value === undefined) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  if (next.size === 0) return undefined;
  return Array.from(next.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
}

export default function MobileFilterBar({ categories, shapeCollections }: MobileFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
  const [filterOpen, setFilterOpen] = useState(false);

  const categoryIdParam = searchParams.get('categoryId');
  const selectedCategoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;

  const attrsParam = searchParams.get('attrs');
  const parsedAttrs = parseAttrsParam(attrsParam);
  const selectedShape = parsedAttrs.get('teapot_shape');

  const rootCategories = categories.filter((c) => c.parentId === null);

  const isRootActive = (cat: Category): boolean => {
    if (selectedCategoryId === Number(cat.id)) return true;
    return (cat.children ?? []).some((child) => Number(child.id) === selectedCategoryId);
  };

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const handleCategorySelect = (id: number | undefined) => {
    updateParams({ categoryId: id !== undefined ? String(id) : undefined });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateParams({
      price_min: min !== undefined ? String(min) : undefined,
      price_max: max !== undefined ? String(max) : undefined,
    });
  };

  const handleShapeSelect = (value: string | undefined) => {
    const newAttrs = buildAttrsParam(parsedAttrs, 'teapot_shape', value);
    updateParams({ attrs: newAttrs });
  };

  const handleReset = () => {
    const params = new URLSearchParams();
    params.delete('page');
    router.push(`/products?${params.toString()}`);
    setFilterOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* 카테고리 칩 행 */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {/* 가로 스크롤 카테고리 칩 */}
        <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategorySelect(undefined)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedCategoryId === undefined
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground',
            )}
          >
            {tCommon('all')}
          </button>
          {rootCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(Number(cat.id))}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isRootActive(cat)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 필터 패널 */}
      {filterOpen && (
        <div className="mt-4 space-y-4 rounded-lg border border-border bg-background p-4">
          <PriceRangeFilter
            min={priceMin}
            max={priceMax}
            onChange={handlePriceChange}
          />

          <TeapotShapeFilter
            collections={shapeCollections}
            selected={selectedShape}
            onSelect={handleShapeSelect}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-md border border-border py-2 text-sm"
            >
              {tCommon('reset')}
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="flex-1 rounded-md bg-foreground py-2 text-sm text-background"
            >
              {t('label')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
