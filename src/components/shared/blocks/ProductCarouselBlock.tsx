'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { productsApi } from '@/lib/api';
import type { Product, ProductCarouselContent } from '@/lib/api';
import ProductCard from '@/components/shared/products/ProductCard';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import { useCarouselProgress } from '@/components/shared/hooks/useCarouselProgress';
import CarouselProgressBar from '@/components/shared/common/CarouselProgressBar';
import CarouselArrowButton from '@/components/shared/common/CarouselArrowButton';
import ViewAllButton from '@/components/shared/common/ViewAllButton';
import { cn } from '@/components/ui/utils';
import type { Locale } from '@/utils/currency';

interface Props {
  content: ProductCarouselContent;
}

export default function ProductCarouselBlock({ content }: Props) {
  const params = useParams();
  const locale = params.locale as Locale;
  const t = useTranslations('product');
  const tCommon = useTranslations('common');
  const { product_ids, category_id, sort, limit, template, title, prefetched_products } = content;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { progress, updateProgress } = useCarouselProgress({ scrollRef });

  const cardWidth = template === 'large' ? 288 : 224;

  const { data: products, loading } = useBlockData<Product>({
    prefetched: prefetched_products,
    fetch: async () => {
      if (product_ids && product_ids.length > 0) {
        return productsApi.getBulk(product_ids.slice(0, limit), locale);
      } else if (category_id) {
        const res = await productsApi.getList({ categoryId: category_id, sort, limit, locale });
        return res.items;
      } else {
        const res = await productsApi.getList({ sort, limit, locale });
        return res.items;
      }
    },
    deps: [product_ids, category_id, sort, limit, locale],
  });

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

  useEffect(() => {
    if (!loading) updateProgress();
  }, [loading, updateProgress]);

  function handleScroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <section className="product-carousel-block py-16 md:py-24">
        {title && <h2 className="mb-2 font-display typo-h3 font-normal">{title}</h2>}
        <div className="catalog-carousel flex gap-0 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 animate-skeleton-shimmer bg-muted h-80 w-1/2 md:w-1/3 xl:w-1/4"
            />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="product-carousel-block py-16 md:py-24">
      <div className="catalog-heading">
        {title && <h2 className="font-display typo-h3 font-normal">{title}</h2>}
        {category_id && (
          <div className="ml-auto">
            <ViewAllButton
              href={`/${locale}/products?categoryId=${category_id}`}
              label={tCommon('viewAll')}
            />
          </div>
        )}
      </div>

      <div className="relative">
        <CarouselArrowButton
          direction="left"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          ariaLabel={t('prevProduct')}
          className={cn(
            'product-carousel-arrow absolute left-2 top-1/2 -translate-y-1/2 z-10',
            'bg-transparent text-foreground shadow-none hover:bg-transparent',
            'transition-opacity duration-200',
            canScrollLeft ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none',
          )}
        />

        <div
          ref={scrollRef}
          className="catalog-carousel flex gap-0 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-4 md:px-4 xl:px-8"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="shrink-0 snap-center w-1/2 md:w-1/3 xl:w-1/4"
            >
              <ProductCard
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
              priceUsd={product.priceUsd} salePriceUsd={product.salePriceUsd} pricingKrwPerUsd={product.pricingKrwPerUsd}
                rating={product.rating}
                reviewCount={product.reviewCount}
                categoryName={product.category?.name}
                status={product.status}
                images={product.images}
                attributes={product.attributes}
                isFreeShipping={product.isFreeShipping}
                isPreOrder={product.isPreOrder}
                preOrderShippingDate={product.preOrderShippingDate}
                locale={locale}
              />
            </div>
          ))}
        </div>

        <CarouselArrowButton
          direction="right"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          ariaLabel={t('nextProduct')}
          className={cn(
            'product-carousel-arrow absolute right-2 top-1/2 -translate-y-1/2 z-10',
            'bg-transparent text-foreground shadow-none hover:bg-transparent',
            'transition-opacity duration-200',
            canScrollRight ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none',
          )}
        />
      </div>

      <CarouselProgressBar progress={progress} className="mt-4 mx-4 md:mx-4 xl:mx-8" />
    </section>
  );
}
