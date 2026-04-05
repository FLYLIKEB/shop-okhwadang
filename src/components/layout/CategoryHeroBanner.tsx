'use client';

import Image from 'next/image';
import type { Category } from '@/lib/api';
import SafeHtml from '@/components/common/SafeHtml';

interface CategoryHeroBannerProps {
  category: Category | null;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1578500494198-4f09534e1f4e?w=800&q=80';

export default function CategoryHeroBanner({ category }: CategoryHeroBannerProps) {
  if (!category) return null;

  const imageSrc = category.imageUrl || DEFAULT_IMAGE;

  return (
    <section className="relative overflow-hidden bg-card">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-[4/3] md:aspect-[16/9] md:w-1/2">
          <Image
            src={imageSrc}
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
            <div className="mt-3 max-w-md">
              <SafeHtml
                html={category.description}
                className="typo-body text-muted-foreground [&_p]:mt-2 [&_p:first-child]:mt-0 [&_strong]:text-foreground [&_a]:text-primary hover:[&_a]:underline"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}