'use client';

import { useTranslations } from 'next-intl';
import { useUrlModal } from '@/hooks/useUrlModal';
import { buildAttrs, useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import PriceRangeFilter from './PriceRangeFilter';
import AttributeValueFilter from './AttributeValueFilter';
import type { Category } from '@/lib/api';
import type { AttributeFilterGroup } from '@/lib/attributeFilterOptions';

interface MobileFilterBarProps {
  categories: Category[];
  filterGroups: AttributeFilterGroup[];
}

export default function MobileFilterBar({ categories, filterGroups }: MobileFilterBarProps) {
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


  const rootCategories = categories.filter((category) => category.parentId === null);
  const categoryItems = [
    { label: tCommon('all'), value: -1 },
    ...rootCategories.map((category) => ({
      label: category.name,
      value: Number(category.id),
    })),
  ];

  const isRootActive = (cat: Category): boolean => {
    if (categoryId === Number(cat.id)) return true;
    return (cat.children ?? []).some((child) => Number(child.id) === categoryId);
  };
  const activeRootCategory = rootCategories.find(isRootActive);

  const handleCategorySelect = (id: number | undefined) => {
    updateQuery({ categoryId: id });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateQuery({
      price_min: min,
      price_max: max,
    });
  };

  const handleAttributeSelect = (code: string, value: string | undefined) => {
    const nextAttrs = buildAttrs(attrs, code, value);
    updateQuery({ attrs: nextAttrs });
  };

  const handleReset = () => {
    resetQuery(['categoryId', 'price_min', 'price_max', 'attrs']);
    setFilterOpen(false);
  };

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <SegmentedOptionGroup
          items={categoryItems}
          value={activeRootCategory ? Number(activeRootCategory.id) : -1}
          onToggle={(value) => handleCategorySelect(value === -1 ? undefined : value)}
          ariaLabel="카테고리 필터"
          className="flex-1 flex-nowrap gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          itemClassName="shrink-0"
          size="xs"
          radius="full"
          tone="primary"
        />
      </div>

      {filterOpen && (
        <div className="mt-4 space-y-4 rounded-lg border border-border bg-background p-4">
          {filterGroups.map((group) => (
            <div key={group.code} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{group.label}</p>
              <AttributeValueFilter
                code={group.code}
                options={group.options}
                selected={attrs.get(group.code)}
                onSelect={(value) => handleAttributeSelect(group.code, value)}
              />
            </div>
          ))}

          <PriceRangeFilter
            min={priceMin}
            max={priceMax}
            onChange={handlePriceChange}
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
