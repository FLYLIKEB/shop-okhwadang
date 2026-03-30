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
    title: '의흥 장인의 손끝에서',
    subtitle: '600년 전통, 정성으로 빚은 자사호를 만나보세요',
    ctaLabel: '컬렉션 보기',
    ctaUrl: '/collection',
    bgColor: 'bg-[#1B3A4B]',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1920&q=80',
  },
  {
    id: 2,
    title: '보이차의 깊은 여운',
    subtitle: '세월이 빚어낸 맛, 엄선된 보이차 컬렉션',
    ctaLabel: '아카이브 보기',
    ctaUrl: '/archive',
    bgColor: 'bg-[#4A6741]',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1920&q=80',
  },
  {
    id: 3,
    title: '찻자리의 완성',
    subtitle: '자사호와 다구로 꾸미는 나만의 다석',
    ctaLabel: '저널 보기',
    ctaUrl: '/journal',
    bgColor: 'bg-[#2A2520]',
    imageUrl: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=1920&q=80',
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
    <section
      role="region"
      aria-label="메인 배너"
      className="relative overflow-hidden"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className={cn(
                'relative min-w-full flex items-center justify-center overflow-hidden',
                'h-[60vh] min-h-[400px] md:h-[80vh] md:min-h-[560px]',
                slide.bgColor,
              )}
            >
              {slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className={cn(
                    'object-cover object-center',
                    slideIndex === selectedIndex && 'animate-kenburns',
                  )}
                  priority={slideIndex === 0}
                  sizes="100vw"
                />
              )}

              {/* dark overlay */}
              <div className="absolute inset-0 bg-black/45" />

              {/* text content */}
              <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
                <p
                  className="animate-fade-in-up text-xs uppercase tracking-[0.25em] text-white/70 mb-4 font-body"
                  style={{ animationDelay: '0s' }}
                >
                  옥화당 공식 쇼핑몰
                </p>
                <h2
                  className="animate-fade-in-up text-4xl md:text-6xl font-display-ko font-semibold tracking-tight text-white leading-tight"
                  style={{ animationDelay: '0.2s' }}
                >
                  {slide.title}
                </h2>
                {slide.subtitle && (
                  <p
                    className="animate-fade-in-up mt-4 text-base md:text-lg text-white/80"
                    style={{ animationDelay: '0.4s' }}
                  >
                    {slide.subtitle}
                  </p>
                )}
                {slide.ctaLabel && slide.ctaUrl && (
                  <div
                    className="animate-fade-in-up mt-8"
                    style={{ animationDelay: '0.6s' }}
                  >
                    <Link
                      href={slide.ctaUrl}
                      className="inline-block border border-white px-8 py-3 text-sm font-medium text-white tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
                    >
                      {slide.ctaLabel}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        aria-label="이전 배너"
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={scrollNext}
        aria-label="다음 배너"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:opacity-60 transition-opacity"
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
              i === selectedIndex ? 'w-8 bg-white' : 'w-4 bg-white/40',
            )}
          />
        ))}
      </div>
    </section>
  );
}
