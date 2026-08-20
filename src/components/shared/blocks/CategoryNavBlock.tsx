'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import { categoriesApi } from '@/lib/api';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import type { Category, CategoryNavContent } from '@/lib/api';
import { selectCategoriesFromTree } from '@/utils/categoryTree';

/* ── 니료(泥料) 컬러 매핑 — 카테고리 slug으로 매칭 ── */
const CLAY_COLORS: Record<string, string> = {
  zuni: '#8B4513',    // 주니(朱泥)
  danni: '#C4A882',   // 단니(段泥)
  zini: '#6B3A5C',    // 자니(紫泥)
  heukni: '#2A2520',  // 흑니(黑泥)
  chunsuni: '#3D6B6B', // 청수니(靑水泥)
  nokni: '#4A6741',   // 녹니(綠泥)
};

function getClayColor(slug: string): string | null {
  for (const [key, color] of Object.entries(CLAY_COLORS)) {
    if (slug.includes(key)) return color;
  }
  return null;
}

function CategoryImageCard({ cat, locale }: { cat: Category; locale: string }) {
  const [imgError, setImgError] = useState(false);
  const handleError = useCallback(() => setImgError(true), []);
  const clayColor = getClayColor(cat.slug);

  return (
    <Link
      href={`/${locale}/products?categoryId=${cat.id}`}
      prefetch={false}
      className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {cat.imageUrl && !imgError ? (
        <Image
          src={cat.imageUrl}
          alt={cat.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) calc(50vw - 0.5rem), calc(25vw - 0.75rem)"
          quality={75}
          onError={handleError}
        />
      ) : imgError || !cat.imageUrl ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: clayColor ?? '#2A2520' }}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
      <span className="absolute inset-0 flex items-center justify-center px-4 font-body text-base font-semibold tracking-tight text-white md:text-lg">
        {cat.name}
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
  const { ref, visible } = useScrollAnimation<HTMLElement>();
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
          <div key={i} className="surface-card px-5 py-6 md:px-6 md:py-8">
            <div className="animate-pulse">
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
      <nav ref={ref} className="border-y border-soft py-12 md:py-20">
        {title && <h2 className="mb-8 text-center typo-h2 font-body tracking-tight">{title}</h2>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <CategoryImageCard key={cat.id} cat={cat} locale={locale} />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav ref={ref} className="border-y border-soft py-12 md:py-20">
      {title && <h2 className="mb-8 text-center typo-h2 font-body tracking-tight">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat, i) => {
          const clayColor = getClayColor(cat.slug);
          return (
            <Link
              key={cat.id}
              href={`/${locale}/products?categoryId=${cat.id}`}
              prefetch={false}
              className="surface-card group flex flex-col gap-3 px-5 py-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:px-6 md:py-8"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms, background-color 0.3s`,
              }}
            >
              {clayColor && (
                <span
                  className="w-8 h-8 rounded-full border border-divider-soft shadow-sm transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: clayColor }}
                  aria-hidden="true"
                />
              )}
              <span className="font-body text-base font-semibold tracking-tight text-foreground">
                {cat.name}
              </span>
              <span className="mt-auto text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
