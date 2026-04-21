'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SafeHtml from '@/components/shared/common/SafeHtml';
import { cn } from '@/components/ui/utils';
import type { HeroBannerContent, HeroBannerSlide } from '@/lib/api';
import { useScrollLogoTransition } from '@/components/shared/hooks/useScrollLogoTransition';
import { ScrollLogoProvider } from '@/contexts/ScrollLogoContext';
import { isSafeUrl } from '@/utils/url';

/**
 * HeroBannerBlock — DB 의 page_blocks.content 로만 렌더된다.
 * 하드코딩 default slides/이미지 없음. slides 가 비어 있으면 아무 것도 렌더하지 않는다.
 * 홈페이지 시드 규칙은 `src/app/[locale]/(routes)/page.tsx` 상단 주석 참조.
 */

interface Props {
  content: HeroBannerContent;
}

interface SliderHeroProps {
  slides: HeroBannerSlide[];
  description?: string;
  sectionRef: React.RefObject<HTMLElement | null>;
}

function SliderHero({ slides, description, sectionRef }: SliderHeroProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });
  const t = useTranslations('home.hero');

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <section ref={sectionRef} role="region" aria-label={t('bannerLabel')} className="relative">
      <div ref={emblaRef} className="overflow-hidden relative z-10">
        <div className="flex">
          {slides.map((slide, slideIndex) => (
            <div
              key={slideIndex}
              className={cn(
                'relative min-w-full flex items-center justify-center overflow-hidden',
                'h-[40svh] min-h-[25rem] md:h-[680px]',
              )}
              style={{ backgroundColor: slide.bg_color ?? '#2A2520' }}
            >
              {slide.image_url && (
                <Image
                  src={slide.image_url}
                  alt={slide.title}
                  fill
                  className={cn(
                    'object-cover object-center',
                    slideIndex === selectedIndex && !slide.image_url.toLowerCase().endsWith('.gif') && 'animate-kenburns',
                  )}
                  priority={slideIndex === 0}
                  sizes="100vw"
                  unoptimized={slide.image_url.toLowerCase().endsWith('.gif')}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

              <div className="relative z-10 w-full px-8 md:px-16 max-w-3xl">
                <p className="typo-label uppercase tracking-[0.35em] text-[#B8976A] mb-4 font-body">
                  {slideIndex === 0 ? t('primaryLabel') : `0${slideIndex + 1}`}
                </p>
                <h1 className="typo-h0 font-display text-white leading-tight">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <div className="mt-5 typo-body text-white/85 font-display leading-relaxed">
                    <SafeHtml html={slide.subtitle} className="[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-[#B8976A] hover:[&_a]:underline" />
                  </div>
                )}
                {slideIndex === 0 && description && (
                  <div className="mt-4 text-white/75">
                    <SafeHtml html={description} className="[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-[#B8976A] hover:[&_a]:underline" />
                  </div>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-10">
                    <Link
                      href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}
                      className="group inline-flex items-center gap-2 typo-button text-white tracking-[0.15em] uppercase"
                    >
                      <span className="relative">
                        <span className="relative inline-block transition-transform duration-300 group-hover:-translate-y-px">
                          {slide.cta_text}
                        </span>
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-white transition-transform duration-300 group-hover:scale-x-110" />
                      </span>
                      <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </Link>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label={t('prevSlide')}
              className="absolute left-6 md:left-12 z-30 flex items-center justify-center text-white/70 hover:text-white transition-colors py-6"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label={t('nextSlide')}
              className="absolute right-6 md:right-12 z-30 flex items-center justify-center text-white/70 hover:text-white transition-colors py-6"
            >
              <ChevronRight className="h-7 w-7" />
            </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={t('goToSlide', { index: idx + 1 })}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  idx === selectedIndex ? 'w-6 bg-[#B8976A]' : 'w-1.5 bg-white/40 hover:bg-white/60',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function HeroBannerBlock({ content }: Props) {
  const { title, subtitle, description, image_url, cta_text, cta_url, template, slides } = content;
  const sectionRef = useRef<HTMLElement>(null);

  const { heroLogoStyle, headerLogoStyle, progress, isHeroVisible } = useScrollLogoTransition({
    heroRef: sectionRef,
  });

  const scrollLogoContextValue = useMemo(
    () => ({
      progress,
      isHeroVisible,
      heroLogoStyle,
      headerLogoStyle,
    }),
    [progress, isHeroVisible, heroLogoStyle, headerLogoStyle]
  );

  if (template === 'slider') {
    // slides 는 DB page_blocks.content.slides 에서 온다. 비어있으면 렌더하지 않음 —
    // 시드 데이터가 올바른지 확인 (scripts/run-seed.sh).
    if (!slides || slides.length === 0) {
      return null;
    }
    return (
      <ScrollLogoProvider value={scrollLogoContextValue}>
        <SliderHero slides={slides} description={description} sectionRef={sectionRef} />
      </ScrollLogoProvider>
    );
  }

  if (template === 'split') {
    return (
      <section className="flex flex-col overflow-hidden md:flex-row bg-card">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="typo-h2 text-foreground">{title}</h2>
          {subtitle && <p className="mt-2 typo-body text-muted-foreground">{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className="mt-4 text-muted-foreground [&_p]:mt-1 [&_strong]:text-foreground [&_b]:text-foreground"
            />
          )}
          {cta_text && cta_url && (
            <Link
              href={isSafeUrl(cta_url) ? cta_url : '#'}
              className="group mt-6 inline-flex items-center gap-2 typo-button text-foreground tracking-[0.15em] uppercase"
            >
              <span className="relative">
                <span className="relative inline-block transition-transform duration-300 group-hover:-translate-y-px">
                  {cta_text}
                </span>
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-foreground transition-transform duration-300 group-hover:scale-x-110" />
              </span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </Link>
          )}
        </div>
        {image_url && (
          <div className="relative aspect-video flex-1">
            <Image src={image_url} alt={title} fill className="object-cover" />
          </div>
        )}
      </section>
    );
  }

  return (
    <ScrollLogoProvider value={scrollLogoContextValue}>
      <section ref={sectionRef} className="relative flex h-[40svh] min-h-[25rem] md:h-[680px] items-center justify-center overflow-hidden bg-neutral-900">
        {image_url && (
          <Image
            src={image_url}
            alt={title}
            fill
            className={cn('object-cover object-center', !image_url.toLowerCase().endsWith('.gif') && 'animate-kenburns')}
            priority
            sizes="100vw"
            unoptimized={image_url.toLowerCase().endsWith('.gif')}
          />
        )}
        {image_url && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />}
        {image_url && <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />}
        <div className={`relative z-10 w-full px-8 md:px-16 ${image_url ? 'text-white' : 'text-foreground'}`}>
          <h1 className={cn('typo-h0 font-display leading-tight', image_url ? 'text-white' : 'text-foreground')}>{title}</h1>
          {subtitle && <p className={cn('mt-5 typo-body font-display leading-relaxed', image_url ? 'text-white/85' : 'text-muted-foreground')}>{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className={cn('mt-4 [&_p]:mt-1', image_url ? 'text-white/75 [&_strong]:text-white [&_b]:text-white [&_a]:text-[#B8976A] hover:[&_a]:underline' : 'text-muted-foreground [&_strong]:text-foreground [&_b]:text-foreground')}
            />
          )}
          {cta_text && cta_url && (
            <div className="mt-10">
              <Link
                href={isSafeUrl(cta_url) ? cta_url : '#'}
                className={cn(
                  'group inline-flex items-center gap-2 typo-button tracking-[0.15em] uppercase',
                  image_url
                    ? 'text-white'
                    : 'text-foreground',
                )}
              >
                <span className="relative">
                  <span className="relative inline-block transition-transform duration-300 group-hover:-translate-y-px">
                    {cta_text}
                  </span>
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current transition-transform duration-300 group-hover:scale-x-110" />
                </span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </ScrollLogoProvider>
  );
}