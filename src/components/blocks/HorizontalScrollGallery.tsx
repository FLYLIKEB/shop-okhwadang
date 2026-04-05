'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import type { Product } from '@/lib/api';
import PriceDisplay from '@/components/common/PriceDisplay';

interface HorizontalScrollGalleryProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  moreHref?: string;
}

export default function HorizontalScrollGallery({
  title,
  subtitle,
  products,
  moreHref,
}: HorizontalScrollGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, products]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-gallery-card]')?.clientWidth ?? 400;
    const gap = 24;
    el.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) : cardWidth + gap,
      behavior: 'smooth',
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="py-20 md:py-32">
      {/* Header */}
      <div className="px-6 md:px-16 mb-12 md:mb-16 flex items-end justify-between">
        <div>
          {subtitle && (
            <p className="typo-label uppercase tracking-[0.3em] text-muted-foreground mb-4">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className="font-display typo-h1 text-foreground">{title}</h2>
          )}
        </div>
        <div className="hidden md:flex items-center gap-6">
          {moreHref && (
            <Link
              href={moreHref}
              className="typo-body-sm text-muted-foreground tracking-[0.15em] uppercase border-b border-transparent hover:border-foreground hover:text-foreground transition-all duration-300"
            >
              View All
            </Link>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="이전 상품"
              className={cn(
                'w-10 h-10 border border-border flex items-center justify-center transition-all duration-300',
                canScrollLeft
                  ? 'text-foreground hover:bg-foreground hover:text-background'
                  : 'text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10 3L5 8L10 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="다음 상품"
              className={cn(
                'w-10 h-10 border border-border flex items-center justify-center transition-all duration-300',
                canScrollRight
                  ? 'text-foreground hover:bg-foreground hover:text-background'
                  : 'text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 3L11 8L6 13" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide px-6 md:px-16 snap-x snap-mandatory"
      >
        {products.map((product) => {
          const thumbnail = product.images[0]?.url;
          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              data-gallery-card
              className="group flex-none w-[75vw] md:w-[35vw] lg:w-[28vw] snap-start"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 75vw, (max-width: 1200px) 35vw, 28vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <span className="typo-label">No Image</span>
                  </div>
                )}
                {product.status === 'soldout' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <span className="typo-label text-foreground tracking-widest uppercase">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-1">
                <p className="typo-body-sm text-foreground leading-snug line-clamp-1">
                  {product.name}
                </p>
                <PriceDisplay price={product.price} salePrice={product.salePrice} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile more link */}
      {moreHref && (
        <div className="md:hidden px-6 mt-8">
          <Link
            href={moreHref}
            className="typo-body-sm text-muted-foreground tracking-[0.15em] uppercase border-b border-muted-foreground/30 pb-0.5 hover:border-foreground hover:text-foreground transition-all duration-300"
          >
            View All
          </Link>
        </div>
      )}
    </section>
  );
}
