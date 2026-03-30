'use client';

import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { Product } from '@/lib/api';

interface FeaturedProductsProps {
  title: string;
  products: Product[];
  moreHref: string;
  isLoading?: boolean;
}

export default function FeaturedProducts({
  title,
  products,
  moreHref,
  isLoading = false,
}: FeaturedProductsProps) {
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  if (!isLoading && products.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`py-12 transition-all duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <div
        className="flex items-center justify-between mb-8"
        style={{ transitionDelay: visible ? '0ms' : undefined }}
      >
        <h2 className="text-2xl font-medium">{title}</h2>
        <Link
          href={moreHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          더 보기
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : products.map((product, i) => (
              <div
                key={product.id}
                className={`transition-all duration-600 ease-out ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: visible ? `${i * 100}ms` : undefined }}
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  salePrice={product.salePrice}
                  status={product.status}
                  images={product.images}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
