'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { categoriesApi } from '@/lib/api';
import type { Category, CategoryNavContent } from '@/lib/api';

interface Props {
  content: CategoryNavContent;
}

export default function CategoryNavBlock({ content }: Props) {
  const { category_ids = [], template } = content;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        const all = await categoriesApi.getTree();
        if (!cancelled) {
          const filtered = all.filter((c) => category_ids.includes(c.id));
          setCategories(filtered);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCategories();
    return () => { cancelled = true; };
  }, [category_ids]);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: category_ids.length || 4 }).map((_, i) => (
          <div key={i} className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  if (template === 'image') {
    return (
      <nav className="flex flex-wrap gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?categoryId=${cat.id}`}
            className="group relative h-32 w-32 overflow-hidden rounded-xl bg-gray-100"
          >
            <Image
              src={`/images/categories/${cat.slug}.jpg`}
              alt={cat.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 text-sm font-medium text-white">
              {cat.name}
            </span>
          </Link>
        ))}
      </nav>
    );
  }

  if (template === 'icon') {
    return (
      <nav className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?categoryId=${cat.id}`}
            className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 px-4 py-3 text-sm hover:bg-gray-100"
          >
            <span className="text-2xl" role="img" aria-label={cat.name}>
              {getCategoryIcon(cat.slug)}
            </span>
            <span>{cat.name}</span>
          </Link>
        ))}
      </nav>
    );
  }

  // Default: text template
  return (
    <nav className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?categoryId=${cat.id}`}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium hover:border-gray-400 hover:bg-gray-50"
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}

function getCategoryIcon(slug: string): string {
  const iconMap: Record<string, string> = {
    top: '\uD83D\uDC55',
    bottom: '\uD83D\uDC56',
    outer: '\uD83E\uDDE5',
    shoes: '\uD83D\uDC5F',
    accessories: '\uD83D\uDC5C',
  };
  return iconMap[slug] ?? '\uD83D\uDCE6';
}
