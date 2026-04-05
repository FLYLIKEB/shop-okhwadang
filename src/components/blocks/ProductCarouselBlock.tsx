'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { productsApi } from '@/lib/api';
import type { Product, ProductCarouselContent } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { cn } from '@/components/ui/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  content: ProductCarouselContent;
}

export default function ProductCarouselBlock({ content }: Props) {
  const params = useParams();
  const locale = params.locale as string;
  const { product_ids, category_id, auto, sort, limit, template, title } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserScrollingRef = useRef(false);

  const AUTO_SCROLL_INTERVAL = 4000;
  const RESUME_DELAY = 6000;

  const cardWidth = template === 'large' ? 288 : 224;
  const gap = 24;
  const isLarge = template === 'large';

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        if (product_ids && product_ids.length > 0) {
          const results = await productsApi.getBulk(product_ids.slice(0, limit));
          if (!cancelled) setProducts(results);
        } else if (category_id) {
          const res = await productsApi.getList({ categoryId: category_id, sort, limit });
          if (!cancelled) setProducts(res.items);
        } else {
          const res = await productsApi.getList({ sort, limit });
          if (!cancelled) setProducts(res.items);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [product_ids, category_id, auto, sort, limit]);

  useEffect(() => {
    if (scrollRef.current && products.length > 0) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [products.length]);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || products.length === 0) return;

    const scrollLeft = el.scrollLeft;
    const cardTotalWidth = cardWidth + gap;
    const newIndex = Math.round(scrollLeft / cardTotalWidth);
    const clampedIndex = Math.max(0, Math.min(newIndex, products.length - 1));

    setActiveIndex(clampedIndex);
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, [cardWidth, gap, products.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateActiveIndex();
    el.addEventListener('scroll', updateActiveIndex, { passive: true });
    const ro = new ResizeObserver(updateActiveIndex);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateActiveIndex);
      ro.disconnect();
    };
  }, [products, updateActiveIndex]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    if (products.length <= 1) return;

    autoScrollTimerRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el || isUserScrollingRef.current) return;

      const cardTotalWidth = cardWidth + gap;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const nextScroll = el.scrollLeft + cardTotalWidth;

      if (nextScroll >= maxScroll - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: cardTotalWidth, behavior: 'smooth' });
      }
    }, AUTO_SCROLL_INTERVAL);
  }, [stopAutoScroll, products.length, cardWidth, gap]);

  const pauseAutoScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    stopAutoScroll();
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      startAutoScroll();
    }, RESUME_DELAY);
  }, [stopAutoScroll, startAutoScroll]);

  useEffect(() => {
    if (products.length > 1) {
      startAutoScroll();
    }
    return () => {
      stopAutoScroll();
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [products.length, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleInteraction = () => {
      if (!isUserScrollingRef.current) {
        pauseAutoScroll();
      }
    };

    el.addEventListener('wheel', handleInteraction, { passive: true });
    el.addEventListener('touchstart', handleInteraction, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleInteraction);
      el.removeEventListener('touchstart', handleInteraction);
    };
  }, [pauseAutoScroll]);

  function scrollBy(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const cardTotalWidth = cardWidth + gap;
    el.scrollBy({ left: direction === 'left' ? -cardTotalWidth : cardTotalWidth, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <section className="py-12">
        {title && <h2 className="text-2xl font-medium mb-8">{title}</h2>}
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'shrink-0 animate-pulse rounded-lg bg-muted',
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
      <div className="relative mb-8">
        {title && <h2 className="text-2xl font-medium pr-24">{title}</h2>}
        {category_id && (
          <Link
            href={`/${locale}/products?categoryId=${category_id}`}
            className="absolute top-0 right-0 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="relative">
          <button
          type="button"
          onClick={() => scrollBy('left')}
          disabled={!canScrollLeft}
          aria-label="이전 상품"
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10',
            'hidden md:flex items-center justify-center',
            'w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            !canScrollLeft && 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-4 md:px-4 xl:px-8 py-4"
        >
          {products.map((product, index) => {
            const isCenter = activeIndex === index;

            return (
              <div
                key={product.id}
                className={cn(
                  'shrink-0 snap-center transition-all duration-500 ease-out will-change-transform',
                  isLarge ? 'w-72' : 'w-56',
                  isCenter ? 'md:scale-105 z-10' : 'scale-100 opacity-80',
                )}
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  salePrice={product.salePrice}
                  shortDescription={product.shortDescription}
                  rating={product.rating}
                  reviewCount={product.reviewCount}
                  status={product.status}
                  images={product.images}
                  priority={index === 0}
                  showCartOnHover
                  categoryName={product.category?.name ?? null}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollBy('right')}
          disabled={!canScrollRight}
          aria-label="다음 상품"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 z-10',
            'hidden md:flex items-center justify-center',
            'w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            !canScrollRight && 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {products.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {products.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardTotalWidth = cardWidth + gap;
                el.scrollTo({ left: index * cardTotalWidth, behavior: 'smooth' });
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                activeIndex === index
                  ? 'w-6 bg-foreground'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
              aria-label={`${index + 1}번 상품으로 이동`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
