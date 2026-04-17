'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import CategoryTree from './CategoryTree';
import PriceRangeFilter from './PriceRangeFilter';
import ClayTypeFilter from './ClayTypeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import FilterSection from './FilterSection';
import type { Category, Collection } from '@/lib/api';

interface FilterSidebarProps {
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

export default function FilterSidebar({ categories, clayCollections, shapeCollections }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('product.filter');
  const [mobileOpen, setMobileOpen] = useState(false);

  const categoryIdParam = searchParams.get('categoryId');
  const selectedCategoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined;

  const attrsParam = searchParams.get('attrs');
  const parsedAttrs = parseAttrsParam(attrsParam);
  const selectedClayType = parsedAttrs.get('clay_type');
  const selectedShape = parsedAttrs.get('teapot_shape');

  const hasActiveFilters =
    selectedCategoryId !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined ||
    selectedClayType !== undefined ||
    selectedShape !== undefined;

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  const handleCategorySelect = useCallback((id: number | undefined) => {
    updateParams({ categoryId: id !== undefined ? String(id) : undefined });
  }, [updateParams]);

  const handlePriceChange = useCallback((min?: number, max?: number) => {
    updateParams({
      price_min: min !== undefined ? String(min) : undefined,
      price_max: max !== undefined ? String(max) : undefined,
    });
  }, [updateParams]);

  const handleClayTypeSelect = useCallback((value: string | undefined) => {
    const newAttrs = buildAttrsParam(parsedAttrs, 'clay_type', value);
    updateParams({ attrs: newAttrs });
  }, [parsedAttrs, updateParams]);

  const handleShapeSelect = useCallback((value: string | undefined) => {
    const newAttrs = buildAttrsParam(parsedAttrs, 'teapot_shape', value);
    updateParams({ attrs: newAttrs });
  }, [parsedAttrs, updateParams]);

  const handleReset = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('categoryId');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('attrs');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  const sidebarContent = (
    <aside aria-label={t('filterLabel')} className="flex flex-col">
      <div className="flex items-center justify-between py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">{t('label')}</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {t('resetFilter')}
          </button>
        )}
      </div>

      <FilterSection title={t('category')} defaultOpen={selectedCategoryId !== undefined}>
        <CategoryTree
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={handleCategorySelect}
        />
      </FilterSection>

      <FilterSection title={t('clayType')} defaultOpen={selectedClayType !== undefined}>
        <ClayTypeFilter
          collections={clayCollections}
          selected={selectedClayType}
          onSelect={handleClayTypeSelect}
        />
      </FilterSection>

      <FilterSection title={t('teapotShape')} defaultOpen={selectedShape !== undefined}>
        <TeapotShapeFilter
          collections={shapeCollections}
          selected={selectedShape}
          onSelect={handleShapeSelect}
        />
      </FilterSection>

      <FilterSection title={t('priceRange')} defaultOpen={priceMin !== undefined || priceMax !== undefined}>
        <PriceRangeFilter
          min={priceMin}
          max={priceMax}
          onChange={handlePriceChange}
        />
      </FilterSection>
    </aside>
  );

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className={cn(
            'rounded-md border border-input bg-background px-3 py-1.5 text-sm',
            'transition-colors hover:bg-accent',
          )}
        >
          {mobileOpen ? t('closeFilter') : t('openFilter')}
        </button>
        {mobileOpen && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            {sidebarContent}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        {sidebarContent}
      </div>
    </>
  );
}
