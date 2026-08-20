'use client';

import { useTranslations } from 'next-intl';

import { useCatalogQueryParams } from '@/components/shared/hooks/useCatalogQueryParams';
import type { Category } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface CategoryFilterSidebarProps {
  categories: Category[];
}

export default function CategoryFilterSidebar({ categories }: CategoryFilterSidebarProps) {
  const t = useTranslations('product.filter');
  const tCommon = useTranslations('common');
  const { categoryId, updateQuery } = useCatalogQueryParams();

  const handleSelect = (nextCategoryId: number | undefined) => {
    updateQuery({ categoryId: nextCategoryId });
  };

  return (
    <aside aria-label={t('category')}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t('category')}</h2>
      <ul className="flex flex-col gap-1">
        <li>
          <Button
            type="button"
            variant={categoryId === undefined ? 'black' : 'gray'}
            size="sm"
            onClick={() => handleSelect(undefined)}
            className="w-full justify-start"
          >
            {tCommon('all')}
          </Button>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Button
              type="button"
              variant={categoryId === category.id ? 'black' : 'gray'}
              size="sm"
              onClick={() => handleSelect(category.id)}
              className="w-full justify-start"
            >
              {category.name}
            </Button>
            {category.children && category.children.length > 0 && (
              <ul className="ml-3 mt-1 flex flex-col gap-1">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Button
                      type="button"
                      variant={categoryId === child.id ? 'black' : 'gray'}
                      size="sm"
                      onClick={() => handleSelect(child.id)}
                      className="w-full justify-start"
                    >
                      {child.name}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
