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
      className="group flex flex-col gap-3"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
      {cat.imageUrl && !imgError ? (
        <Image
          src={cat.imageUrl}
          alt={cat.nameEn || cat.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) calc(50vw - 0.5rem), calc(25vw - 0.75rem)"
          quality={75}
          onError={handleError}
        />
      ) : imgError || !cat.imageUrl ? (
        <div
          className="absolute inset-0 bg-muted"
        />
      ) : null}
      </div>
      <span className="typo-body-sm text-foreground underline-offset-4 group-hover:underline">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: category_ids.length || 4 }).map((_, i) => (
          <div key={i} className="py-6 md:py-8">
            <div className="animate-skeleton-shimmer">
              <div className="h-10 w-10 rounded bg-muted mb-4" />
              <div className="h-4 w-16 rounded bg-muted mb-2" />
              <div className="h-3 w-10 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  if (template === 'image') {
    return (
      <nav ref={ref} className="py-16 md:py-24">
        {title && <h2 className="mb-8 typo-h3 font-body">{title}</h2>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <CategoryImageCard key={cat.id} cat={cat} locale={locale} />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav ref={ref} className="py-16 md:py-24">
      {title && <h2 className="mb-8 typo-h3 font-body">{title}</h2>}
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
