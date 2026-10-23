'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SafeHtml from '@/components/shared/common/SafeHtml';
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
                'relative min-w-full flex items-end overflow-hidden',
                'hero-banner-height',
              )}
              style={{ backgroundColor: slide.bg_color ?? 'var(--color-foreground)' }}
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
                    className="object-cover object-center"
                    priority={slideIndex === 0}
                    fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                    sizes="100vw"
                    unoptimized={slide.image_url.toLowerCase().endsWith('.gif')}
                  />
                </picture>
              )}

              <div className="hero-shade" />

              <div className="hero-caption">
                <p className="typo-label uppercase tracking-widest text-white/85 mb-4 font-body">
                  {slideIndex === 0 ? t('primaryLabel') : `0${slideIndex + 1}`}
                </p>
                <h1 className="font-display typo-h0 font-normal leading-tight text-white">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <div className="mt-5 font-display typo-body leading-relaxed text-white/85">
                    <SafeHtml html={slide.subtitle} className="cms-description [&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-primary hover:[&_a]:underline" />
                  </div>
                )}
                {slideIndex === 0 && description && (
                  <div className="mt-4 text-white/75">
                    <SafeHtml html={description} className="cms-description [&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-primary hover:[&_a]:underline" />
                  </div>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-10">
                    <Button asChild variant="ghost" size="lg" className="gap-4 rounded-none px-0 text-white underline underline-offset-8 hover:bg-transparent hover:text-white/80">
                      <Link href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}>
                        {slide.cta_text}
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
          <div className="absolute bottom-4 right-6 z-30 flex items-center md:right-16">
            {slides.map((_, idx) => (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => scrollTo(idx)}
                aria-label={t('goToSlide', { index: idx + 1 })}
                className={cn(
                  'h-11 w-11 rounded-none p-0 hover:bg-transparent',
                )}
              >
                <span className={cn('h-px w-full', idx === selectedIndex ? 'bg-white' : 'bg-white/45')} />
              </Button>
            ))}
          </div>
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
            className={cn('cms-description max-w-xl mx-auto text-sm leading-relaxed', descriptionClass)}
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
          {subtitle && <p className="cms-description mt-2 typo-body text-muted-foreground">{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className="cms-description mt-4 text-muted-foreground [&_p]:mt-1 [&_strong]:text-foreground [&_b]:text-foreground"
            />
          )}
          {cta_text && cta_url && (
            <Button asChild variant="black" size="lg" className="mt-6 gap-2">
              <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>
                {cta_text}
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
      <section ref={sectionRef} className="hero-banner-height relative flex items-end overflow-hidden bg-foreground">
        {image_url && (
          <Image
            src={image_derivatives?.desktop ?? image_url}
            alt={title}
            fill
            className="object-cover object-center"
            priority
            fetchPriority="high"
            sizes="100vw"
            unoptimized={image_url.toLowerCase().endsWith('.gif')}
          />
        )}
        {image_url && <div className="hero-shade" />}
        <div className="hero-caption text-white">
          <h1 className="font-display typo-h0 font-normal leading-tight text-white">{title}</h1>
          {subtitle && <p className="cms-description mt-5 font-display typo-body leading-relaxed text-white/85">{subtitle}</p>}
          {description && (
            <SafeHtml
              html={description}
              className="cms-description mt-4 text-white/85 [&_p]:mt-1 [&_strong]:text-white [&_b]:text-white [&_a]:text-white hover:[&_a]:underline"
            />
          )}
          {cta_text && cta_url && (
            <div className="mt-10">
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="gap-4 rounded-none px-0 text-white underline underline-offset-8 hover:bg-transparent hover:text-white/80"
              >
                <Link href={isSafeUrl(cta_url) ? cta_url : '#'}>
                  {cta_text}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </ScrollLogoProvider>
  );
}
