'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { productsApi } from '@/lib/api';
import type { Product, ProductGridContent } from '@/lib/api';
import ProductCard from '@/components/shared/products/ProductCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';
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
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('common');
  const { product_ids, category_id, auto, limit, template, title, more_href, prefetched_products } = content;
  const [products, setProducts] = useState<Product[]>(prefetched_products ?? []);
  const [loading, setLoading] = useState(!prefetched_products);
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  useEffect(() => {
    if (prefetched_products && prefetched_products.length > 0) return;

    let cancelled = false;

    async function fetchProducts() {
      try {
        if (product_ids && product_ids.length > 0) {
          const results = await productsApi.getBulk(product_ids.slice(0, limit), locale);
          if (!cancelled) {
            setProducts(results);
          }
        } else if (category_id) {
          const res = await productsApi.getList({ categoryId: category_id, limit, locale });
          if (!cancelled) setProducts(res.items);
        } else {
          const res = await productsApi.getList({ limit, locale });
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
  }, [product_ids, category_id, auto, limit, prefetched_products]);

  const gridCols = gridColsMap[template] ?? gridColsMap['4col'];

  if (loading) {
    return (
      <section className="py-12">
        {title && <h2 className="font-semibold mb-8 text-center">{title}</h2>}
        <div className={cn('grid gap-10', gridCols)}>
          {Array.from({ length: limit || 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section
      ref={ref}
      className={cn(
        'py-12 transition-all duration-600 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      )}
    >
      <div className="mb-8">
        {title && <h2 className="font-semibold text-center">{title}</h2>}
        {(more_href || category_id) && (
          <div className="flex justify-end mt-2">
            <Link
              href={more_href || `/${locale}/products?categoryId=${category_id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('viewAll')}
            </Link>
          </div>
        )}
      </div>
      <div className={cn('grid gap-10', gridCols)}>
        {products.map((product, i) => (
          <div
            key={product.id}
            className={cn(
              'transition-all duration-600 ease-out',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
            )}
            style={{ transitionDelay: visible ? `${i * 100}ms` : undefined }}
          >
            <ProductCard
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.salePrice}
              categoryName={product.category?.name}
              status={product.status}
              images={product.images}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
