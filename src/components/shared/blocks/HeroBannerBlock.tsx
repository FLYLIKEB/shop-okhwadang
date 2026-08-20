'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SafeHtml from '@/components/shared/common/SafeHtml';
import CarouselArrowButton from '@/components/shared/common/CarouselArrowButton';
import { cn } from '@/components/ui/utils';
import type { HeroBannerContent, HeroBannerSlide } from '@/lib/api';
import { useScrollLogoTransition } from '@/components/shared/hooks/useScrollLogoTransition';
import { ScrollLogoProvider } from '@/contexts/ScrollLogoContext';
import { isSafeUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';

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
                'hero-banner-height',
              )}
              style={{ backgroundColor: slide.bg_color ?? '#2A2520' }}
            >
              {slide.image_url && (
                <picture>
                  {slide.image_derivatives?.mobile && (
                    <source media="(max-width: 767px)" srcSet={slide.image_derivatives.mobile} />
                  )}
                  <Image
                    src={slide.image_derivatives?.desktop ?? slide.image_url}
                    alt={slide.title}
                    fill
                    className={cn(
                      'object-cover object-center',
                      slideIndex === selectedIndex && !slide.image_url.toLowerCase().endsWith('.gif') && 'animate-kenburns',
                    )}
                    priority={slideIndex === 0}
                    fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                    sizes="100vw"
                    unoptimized={slide.image_url.toLowerCase().endsWith('.gif')}
                  />
                </picture>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

              <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-8 text-center md:px-16">
                <p className="typo-label uppercase tracking-[0.35em] text-primary mb-4 font-body">
                  {slideIndex === 0 ? t('primaryLabel') : `0${slideIndex + 1}`}
                </p>
                <h1 className="font-display typo-h0 leading-tight text-white">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <div className="mt-5 font-display typo-body leading-relaxed text-white/85">
                    <SafeHtml html={slide.subtitle} className="[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-primary hover:[&_a]:underline" />
                  </div>
                )}
                {slideIndex === 0 && description && (
                  <div className="mt-4 text-white/75">
                    <SafeHtml html={description} className="[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-primary hover:[&_a]:underline" />
                  </div>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-10">
                    <Button asChild variant="gray" size="lg" className="gap-2">
                      <Link href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}>
                        {slide.cta_text}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
          <>
            <CarouselArrowButton
              direction="left"
              onClick={scrollPrev}
              ariaLabel={t('prevSlide')}
              className="absolute left-2 bottom-16 z-30 hidden h-10 min-h-10 w-10 rounded-full bg-transparent text-white/75 transition-colors hover:bg-white/15 hover:text-white md:flex md:left-12 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
            />
            <CarouselArrowButton
              direction="right"
              onClick={scrollNext}
              ariaLabel={t('nextSlide')}
              className="absolute right-2 bottom-16 z-30 hidden h-10 min-h-10 w-10 rounded-full bg-transparent text-white/75 transition-colors hover:bg-white/15 hover:text-white md:flex md:right-12 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
            />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {slides.map((_, idx) => (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => scrollTo(idx)}
                aria-label={t('goToSlide', { index: idx + 1 })}
                className={cn(
                  'h-1 min-h-1 rounded-full p-0 transition-all duration-300',
                  idx === selectedIndex
                    ? 'w-6 bg-white hover:bg-white'
                    : 'w-1.5 bg-white/45 hover:bg-white/75',
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
  const { title, eyebrow, subtitle, description, image_url, image_derivatives, cta_text, cta_url, template, slides, bgColor } = content;
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

  if (template === 'simple') {
    const isForeground = bgColor === 'foreground';
    const backgroundClass = isForeground ? 'bg-foreground text-background' : bgColor === 'muted' ? 'bg-muted text-foreground' : 'bg-background text-foreground';
    const eyebrowClass = isForeground ? 'text-background/60' : 'text-muted-foreground';
    const descriptionClass = isForeground ? 'text-background/70' : 'text-muted-foreground';

    return (
      <section className={cn('py-20 px-4 text-center', backgroundClass)}>
        {eyebrow && (
          <p className={cn('text-xs font-semibold tracking-widest uppercase mb-3', eyebrowClass)}>
            {eyebrow}
          </p>
        )}
        <h1 className="mb-4 font-display typo-h1 tracking-tight">{title}</h1>
        {description && (
          <SafeHtml
            html={description}
            className={cn('max-w-xl mx-auto text-sm leading-relaxed', descriptionClass)}
          />
        )}
      </section>
    );
  }

  if (template === 'split') {
    return (
      <section className="flex flex-col overflow-hidden md:flex-row bg-card">
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center md:p-12">
          <h2 className="typo-h2 text-foreground">{title}</h2>
          {subtitle && <p className="mt-2 typo-body text-muted-foreground">{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className="mt-4 text-muted-foreground [&_p]:mt-1 [&_strong]:text-foreground [&_b]:text-foreground"
            />
          )}
          {cta_text && cta_url && (
            <Button asChild variant="black" size="lg" className="mt-6 gap-2">
              <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>
                {cta_text}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {image_url && (
          <div className="relative aspect-video flex-1">
            <Image src={image_derivatives?.desktop ?? image_url} alt={title} fill className="object-cover" />
          </div>
        )}
      </section>
    );
  }

  return (
    <ScrollLogoProvider value={scrollLogoContextValue}>
      <section ref={sectionRef} className="hero-banner-height relative flex items-center justify-center overflow-hidden bg-neutral-900">
        {image_url && (
          <Image
            src={image_derivatives?.desktop ?? image_url}
            alt={title}
            fill
            className={cn('object-cover object-center', !image_url.toLowerCase().endsWith('.gif') && 'animate-kenburns')}
            priority
            fetchPriority="high"
            sizes="100vw"
            unoptimized={image_url.toLowerCase().endsWith('.gif')}
          />
        )}
        {image_url && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />}
        {image_url && <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />}
        <div className={`relative z-10 w-full px-8 text-center md:px-16 ${image_url ? 'text-white' : 'text-foreground'}`}>
          <h1 className={cn('font-display typo-h0 leading-tight', image_url ? 'text-white' : 'text-foreground')}>{title}</h1>
          {subtitle && <p className={cn('mt-5 font-display typo-body leading-relaxed', image_url ? 'text-white/85' : 'text-muted-foreground')}>{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className={cn('mt-4 [&_p]:mt-1', image_url ? 'text-white/75 [&_strong]:text-white [&_b]:text-white [&_a]:text-primary hover:[&_a]:underline' : 'text-muted-foreground [&_strong]:text-foreground [&_b]:text-foreground')}
            />
          )}
          {cta_text && cta_url && (
            <div className="mt-10">
              <Button
                asChild
                variant={image_url ? 'gray' : 'black'}
                size="lg"
                className="gap-2"
              >
                <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>
                  {cta_text}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </ScrollLogoProvider>
  );
}
