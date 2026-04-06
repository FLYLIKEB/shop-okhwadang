'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { categoriesApi } from '@/lib/api';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { Category, CategoryNavContent } from '@/lib/api';

interface Props {
  content: CategoryNavContent;
}

export default function CategoryNavBlock({ content }: Props) {
  const { title, category_ids = [], template, prefetched_categories } = content;
  const [categories, setCategories] = useState<Category[]>(prefetched_categories ?? []);
  const [loading, setLoading] = useState(!prefetched_categories);
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  useEffect(() => {
    if (prefetched_categories && prefetched_categories.length > 0) return;

    let cancelled = false;

    async function fetchCategories() {
      try {
        const all = await categoriesApi.getTree();
        if (!cancelled) {
          if (category_ids.length > 0) {
            setCategories(all.filter((c) => category_ids.includes(c.id)));
          } else {
            setCategories(all.filter((c) => c.parentId === null));
          }
        }
      } catch (err) {
        void err;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCategories();
    return () => { cancelled = true; };
  }, [category_ids, prefetched_categories]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {Array.from({ length: category_ids.length || 4 }).map((_, i) => (
          <div key={i} className="bg-background px-6 py-8">
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
      <nav ref={ref} className="py-12">
        {title && <h2 className="text-2xl font-medium mb-8 text-center">{title}</h2>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/products?categoryId=${cat.id}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms`,
              }}
            >
              {cat.imageUrl && (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
              <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-medium text-white tracking-wide">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav ref={ref} className="py-12 border-t border-border">
      {title && <h2 className="text-2xl font-medium mb-8 text-center">{title}</h2>}
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/products?categoryId=${cat.id}`}
            className="group bg-background px-6 py-8 flex flex-col gap-3 hover:bg-muted/40 transition-colors duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms, background-color 0.3s`,
            }}
          >
            <span className="font-display text-base font-medium text-foreground tracking-wide">
              {cat.name}
            </span>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-auto">
              →
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
