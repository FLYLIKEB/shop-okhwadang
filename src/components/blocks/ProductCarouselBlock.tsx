'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';
import type { Product, ProductCarouselContent } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { cn } from '@/components/ui/utils';

interface Props {
  content: ProductCarouselContent;
}

export default function ProductCarouselBlock({ content }: Props) {
  const { product_ids, category_id, limit, template, title } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        if (product_ids && product_ids.length > 0) {
          const results = await Promise.all(
            product_ids.slice(0, limit).map((id) =>
              productsApi.getById(id).then((p): Product => p).catch(() => null),
            ),
          );
          if (!cancelled) {
            const filtered = results.filter((p): p is Product => p !== null);
            setProducts(filtered);
          }
        } else if (category_id) {
          const res = await productsApi.getList({ categoryId: category_id, limit });
          if (!cancelled) setProducts(res.items);
        } else {
          const res = await productsApi.getList({ limit });
          if (!cancelled) setProducts(res.items);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [product_ids, category_id, limit]);

  const isLarge = template === 'large';

  if (loading) {
    return (
      <section className="space-y-4">
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'shrink-0 animate-pulse rounded-lg bg-gray-200',
                isLarge ? 'h-80 w-72' : 'h-64 w-56',
              )}
            />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="space-y-4">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {products.map((product) => (
          <div
            key={product.id}
            className={cn('shrink-0', isLarge ? 'w-72' : 'w-56')}
          >
            <ProductCard {...product} />
          </div>
        ))}
      </div>
    </section>
  );
}
