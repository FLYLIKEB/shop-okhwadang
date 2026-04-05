'use client';

import Image from 'next/image';
import type { Category } from '@/lib/api';

interface CategoryHeroBannerProps {
  category: Category | null;
  imageUrl?: string;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1578500494198-4f09534e1f4e?w=800&q=80';

export default function CategoryHeroBanner({ category, imageUrl }: CategoryHeroBannerProps) {
  if (!category) return null;

  return (
    <section className="relative overflow-hidden bg-card">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-1/2 h-48 md:h-64">
          <Image
            src={imageUrl || DEFAULT_IMAGE}
            alt={category.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-1 flex-col justify-center p-6 md:p-10">
          <h1 className="typo-h1 font-display text-foreground">{category.name}</h1>
          {category.description && (
            <p className="mt-3 typo-body text-muted-foreground max-w-md">
              {category.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}