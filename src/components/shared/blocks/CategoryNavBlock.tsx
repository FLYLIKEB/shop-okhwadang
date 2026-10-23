'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { categoriesApi } from '@/lib/api';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import type { Category, CategoryNavContent } from '@/lib/api';
import { selectCategoriesFromTree } from '@/utils/categoryTree';

function CategoryImageCard({ cat, locale }: { cat: Category; locale: string }) {
  const [imgError, setImgError] = useState(false);
  const handleError = useCallback(() => setImgError(true), []);

  return (
    <Link
      href={`/${locale}/products?categoryId=${cat.id}`}
      prefetch={false}
      className="group flex min-w-0 items-center gap-3"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-muted md:h-16 md:w-16">
      {cat.imageUrl && !imgError ? (
        <Image
          src={cat.imageUrl}
          alt={cat.nameEn || cat.name}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 64px, 56px"
          quality={75}
          onError={handleError}
        />
      ) : imgError || !cat.imageUrl ? (
        <div
          className="absolute inset-0 bg-muted"
        />
      ) : null}
      </div>
      <span className="min-w-0 break-words typo-body-sm text-foreground underline-offset-4 group-hover:underline">
        {cat.nameEn || cat.name}
      </span>
    </Link>
  );
}

const EMPTY_CATEGORY_IDS: number[] = [];

interface Props {
  content: CategoryNavContent;
}

export default function CategoryNavBlock({ content }: Props) {
  const { title, template, prefetched_categories } = content;
  const category_ids = content.category_ids ?? EMPTY_CATEGORY_IDS;
  const { ref } = useScrollAnimation<HTMLElement>();
  const params = useParams();
  const locale = params.locale as string;

  const { data: categories, loading } = useBlockData<Category>({
    prefetched: prefetched_categories,
    fetch: async () => {
      const all = await categoriesApi.getTree(locale);
      return selectCategoriesFromTree(all, category_ids);
    },
    deps: [category_ids, locale],
  });

  if (loading) {
    return (
      <nav className="py-8 md:py-12">
        {title && <h2 className="mb-4 typo-h3 font-body">{title}</h2>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: category_ids.length || 4 }).map((_, i) => (
          <div key={i} className="flex min-w-0 items-center gap-3">
            <div className="h-14 w-14 shrink-0 bg-muted animate-skeleton-shimmer md:h-16 md:w-16" />
            <div className="h-3 w-12 bg-muted animate-skeleton-shimmer" />
          </div>
        ))}
        </div>
      </nav>
    );
  }

  if (categories.length === 0) return null;

  if (template === 'image') {
    return (
      <nav ref={ref} className="py-8 md:py-12">
        {title && <h2 className="mb-4 typo-h3 font-body">{title}</h2>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categories.map((cat) => (
            <CategoryImageCard key={cat.id} cat={cat} locale={locale} />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav ref={ref} className="py-8 md:py-12">
      {title && <h2 className="mb-4 typo-h3 font-body">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/products?categoryId=${cat.id}`}
              prefetch={false}
              className="flex min-h-11 items-center border-b border-soft py-3 typo-body-sm text-foreground underline-offset-4 hover:underline"
            >
                {cat.nameEn || cat.name}
            </Link>
        ))}
      </div>
    </nav>
  );
}
