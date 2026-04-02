'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { productsApi } from '@/lib/api';
import type { Product, ProductCarouselContent } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { cn } from '@/components/ui/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  content: ProductCarouselContent;
}

export default function ProductCarouselBlock({ content }: Props) {
  const { product_ids, category_id, limit, template, title } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        if (product_ids && product_ids.length > 0) {
          const results = await productsApi.getBulk(product_ids.slice(0, limit));
          if (!cancelled) {
            setProducts(results);
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

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [products, updateScrollState]);

  const cardWidth = template === 'large' ? 288 : 224; // w-72 = 288px, w-56 = 224px
  const gap = 24; // gap-6 = 24px

  function scrollBy(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = cardWidth + gap;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  const isLarge = template === 'large';

  if (loading) {
    return (
      <section className="py-12">
        {title && <h2 className="text-2xl font-medium mb-8">{title}</h2>}
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'shrink-0 animate-pulse rounded bg-muted',
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
    <section className="py-12">
      {title && <h2 className="text-2xl font-medium mb-8">{title}</h2>}
      <div className="relative group">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => scrollBy('left')}
          disabled={!canScrollLeft}
          aria-label="이전 상품"
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
            'hidden md:flex items-center justify-center',
            'w-10 h-10 rounded-full bg-background border border-border shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            !canScrollLeft && 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className={cn('shrink-0', isLarge ? 'w-72' : 'w-56')}
            >
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
                shortDescription={product.shortDescription}
                status={product.status}
                images={product.images}
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scrollBy('right')}
          disabled={!canScrollRight}
          aria-label="다음 상품"
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
            'hidden md:flex items-center justify-center',
            'w-10 h-10 rounded-full bg-background border border-border shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            !canScrollRight && 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
