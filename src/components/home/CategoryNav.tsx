'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { Category } from '@/lib/api';

interface CategoryNavProps {
  categories: Category[];
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="relative aspect-[4/3] w-full animate-pulse overflow-hidden rounded-sm bg-muted" />
  );
}

export default function CategoryNav({ categories, isLoading = false }: CategoryNavProps) {
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  if (!isLoading && categories.length === 0) return null;

  return (
    <section ref={ref} className="py-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className={`group relative block aspect-[4/3] overflow-hidden rounded-sm bg-muted transition-all duration-600 ease-out ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: visible ? `${i * 100}ms` : undefined }}
              >
                <Image
                  src={`/images/categories/${cat.slug}.jpg`}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* dark overlay on hover */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/30" />
                {/* title */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-4">
                  <span className="text-sm font-medium tracking-wide text-white sm:text-base">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
