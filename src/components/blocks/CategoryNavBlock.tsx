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
          <div key={i} className="h-10 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
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
            className="group relative h-32 w-32 overflow-hidden bg-muted"
          >
            <Image
              src={`/images/categories/${cat.slug}.jpg`}
              alt={cat.name}
              fill
              className="object-cover transition-opacity group-hover:opacity-80"
            />
            <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 text-sm font-medium text-white">
              {cat.name}
            </span>
          </Link>
        ))}
      </nav>
    );
  }

  // Default: text template - clean and minimal
  return (
    <nav className="flex flex-wrap gap-3">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?categoryId=${cat.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
