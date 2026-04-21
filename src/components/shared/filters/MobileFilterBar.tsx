'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { useUrlModal } from '@/hooks/useUrlModal';
import { buildAttrs, useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import PriceRangeFilter from './PriceRangeFilter';
import TeapotShapeFilter from './TeapotShapeFilter';
import type { Category, Collection } from '@/lib/api';

interface MobileFilterBarProps {
  categories: Category[];
  clayCollections: Collection[];
  shapeCollections: Collection[];
}

export default function MobileFilterBar({ categories, shapeCollections }: MobileFilterBarProps) {
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
  const [filterOpen, setFilterOpen] = useUrlModal('filters');
  const {
    attrs,
    categoryId,
    priceMin,
    priceMax,
    updateQuery,
    resetQuery,
  } = useCatalogQueryParams();

  const selectedShape = attrs.get('teapot_shape');

  const rootCategories = categories.filter((category) => category.parentId === null);

  const isRootActive = (cat: Category): boolean => {
    if (categoryId === Number(cat.id)) return true;
    return (cat.children ?? []).some((child) => Number(child.id) === categoryId);
  };

  const handleCategorySelect = (id: number | undefined) => {
    updateQuery({ categoryId: id });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateQuery({
      price_min: min,
      price_max: max,
    });
  };

  const handleShapeSelect = (value: string | undefined) => {
    const nextAttrs = buildAttrs(attrs, 'teapot_shape', value);
    updateQuery({ attrs: nextAttrs });
  };

  const handleReset = () => {
    resetQuery(['categoryId', 'price_min', 'price_max', 'attrs']);
    setFilterOpen(false);
  };

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategorySelect(undefined)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              categoryId === undefined
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
