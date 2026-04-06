'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { categoriesApi } from '@/lib/api';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import SafeHtml from '@/components/common/SafeHtml';
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
          <div key={i} className="bg-background py-10 px-4 sm:px-6">
            <div className="animate-pulse">
              <div className="h-10 w-16 rounded bg-muted mb-3" />
              <div className="h-4 w-24 rounded bg-muted" />
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
              className="group relative aspect-[4/3] overflow-hidden bg-muted"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms`,
              }}
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized
                />
              ) : (
                <Image
                  src={`/images/categories/${cat.slug}.jpg`}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="font-display text-lg font-medium text-white tracking-wide text-center">
                  {cat.name}
                </span>
                {cat.description && (
                  <span className="text-xs text-white/70 text-center line-clamp-2 [&_br]:hidden px-2">
                    <SafeHtml html={cat.description} className="[&_p]:!mt-0 [&_strong]:!text-white/80 [&_b]:!text-white/80 [&_span]:!text-white/70" />
                  </span>
                )}
              </div>
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
            className="group relative bg-background py-10 px-4 sm:px-6 flex flex-col gap-2 hover:bg-muted/30 transition-colors duration-500"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms, background-color 0.5s`,
            }}
          >
            <span className="font-display text-2xl sm:text-3xl font-light text-foreground tracking-wide relative inline-block">
              {cat.name}
              <span className="absolute -bottom-1 left-0 h-px w-0 group-hover:w-full bg-foreground/40 transition-all duration-700 ease-out" />
            </span>
            {cat.description && (
              <span className="text-sm text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 [&_p]:!mt-0 [&_strong]:!text-muted-foreground [&_b]:!text-muted-foreground">
                <SafeHtml html={cat.description} />
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
