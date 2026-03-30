'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export interface BannerSlide {
  id: number;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  bgColor: string;
  imageUrl?: string;
}

const defaultSlides: BannerSlide[] = [
  {
    id: 1,
    title: '신상품 출시',
    subtitle: '새로운 컬렉션을 만나보세요',
    ctaLabel: '쇼핑하기',
    ctaUrl: '/products',
    bgColor: 'bg-white',
  },
  {
    id: 2,
    title: '특별 할인 이벤트',
    subtitle: '최대 50% 할인 혜택을 누리세요',
    ctaLabel: '할인 상품 보기',
    ctaUrl: '/products?sort=popular',
    bgColor: 'bg-white',
  },
  {
    id: 3,
    title: '추천 상품 모음',
    subtitle: '큐레이터가 엄선한 베스트 아이템',
    ctaLabel: '추천 상품 보기',
    ctaUrl: '/products?isFeatured=true',
    bgColor: 'bg-white',
  },
];

interface HeroBannerSliderProps {
  slides?: BannerSlide[];
}

export default function HeroBannerSlider({ slides = defaultSlides }: HeroBannerSliderProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  if (slides.length === 0) return null;

  return (
    <section role="region" aria-label="메인 배너" className="relative overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`relative min-w-full flex items-center justify-center ${slide.bgColor} py-24 px-8`}
            >
              {slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              <div className="relative text-center space-y-6 max-w-xl">
                <h2 className="text-4xl font-medium tracking-tight text-foreground">{slide.title}</h2>
                {slide.subtitle && (
                  <p className="text-muted-foreground text-base">{slide.subtitle}</p>
                )}
                {slide.ctaLabel && slide.ctaUrl && (
                  <Link
                    href={slide.ctaUrl}
                    className="inline-block border border-foreground px-8 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    {slide.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        aria-label="이전 배너"
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-foreground hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={scrollNext}
        aria-label="다음 배너"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-foreground hover:opacity-60 transition-opacity"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            className={cn(
              'h-0.5 transition-all',
              i === selectedIndex ? 'w-8 bg-foreground' : 'w-4 bg-foreground/30',
            )}
          />
        ))}
      </div>
    </section>
  );
}
