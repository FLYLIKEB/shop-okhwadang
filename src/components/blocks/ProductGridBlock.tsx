'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';
import type { Product, ProductGridContent } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { cn } from '@/components/ui/utils';

interface Props {
  content: ProductGridContent;
}

const gridColsMap: Record<string, string> = {
  '2col': 'grid-cols-2',
  '3col': 'grid-cols-2 md:grid-cols-3',
  '4col': 'grid-cols-2 md:grid-cols-4',
};

export default function ProductGridBlock({ content }: Props) {
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
          if (!cancelled) {
            setProducts(res.items);
          }
        } else {
          const res = await productsApi.getList({ limit });
          if (!cancelled) {
            setProducts(res.items);
          }
        }
      } catch {
        // Silently fail - show empty grid
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [product_ids, category_id, limit]);

  const gridCols = gridColsMap[template] ?? gridColsMap['3col'];

  if (loading) {
    return (
      <section className="space-y-4">
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        <div className={cn('grid gap-4', gridCols)}>
          {Array.from({ length: limit || 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="space-y-4">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <div className={cn('grid gap-4', gridCols)}>
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}
