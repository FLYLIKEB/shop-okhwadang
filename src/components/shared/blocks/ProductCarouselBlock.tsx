'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { productsApi } from '@/lib/api';
import type { Product, ProductCarouselContent } from '@/lib/api';
import ProductCard from '@/components/shared/products/ProductCard';
import { cn } from '@/components/ui/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  content: ProductCarouselContent;
}

export default function ProductCarouselBlock({ content }: Props) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('product');
  const tCommon = useTranslations('common');
  const { product_ids, category_id, sort, limit, template, title } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cardWidth = template === 'large' ? 288 : 224;
  const gap = 24;

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        if (product_ids && product_ids.length > 0) {
          const results = await productsApi.getBulk(product_ids.slice(0, limit), locale);
          if (!cancelled) setProducts(results);
        } else if (category_id) {
          const res = await productsApi.getList({ categoryId: category_id, sort, limit, locale });
          if (!cancelled) setProducts(res.items);
        } else {
          const res = await productsApi.getList({ sort, limit, locale });
          if (!cancelled) setProducts(res.items);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [product_ids, category_id, sort, limit, locale]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
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

  function handleScroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const cardTotalWidth = cardWidth + gap;
    el.scrollBy({ left: direction === 'left' ? -cardTotalWidth : cardTotalWidth, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <section className="py-12">
        {title && <h2 className="font-semibold mb-8 text-center">{title}</h2>}
        <div className="flex gap-10 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 animate-pulse rounded-lg bg-muted h-80 w-[calc(50%-20px)] md:w-[calc(33.333%-27px)] xl:w-[calc(25%-30px)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-8">
        {title && <h2 className="font-semibold text-center">{title}</h2>}
        {category_id && (
          <div className="flex justify-end mt-2">
            <Link
              href={`/${locale}/products?categoryId=${category_id}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tCommon('viewAll')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <div className="relative group">
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label={t('prevProduct')}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10',
            'flex items-center justify-center',
            'w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm',
            'transition-opacity duration-200',
            canScrollLeft ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-10 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-4 md:px-4 xl:px-8 py-4"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="shrink-0 snap-center w-[calc(50%-20px)] md:w-[calc(33.333%-27px)] xl:w-[calc(25%-30px)]"
            >
              <ProductCard
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
                rating={product.rating}
                reviewCount={product.reviewCount}
                categoryName={product.category?.name}
                status={product.status}
                images={product.images}
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label={t('nextProduct')}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 z-10',
            'flex items-center justify-center',
            'w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm',
            'transition-opacity duration-200',
            canScrollRight ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
