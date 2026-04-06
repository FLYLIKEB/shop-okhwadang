'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SafeHtml from '@/components/common/SafeHtml';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import type { HeroBannerContent, HeroBannerSlide } from '@/lib/api';
import { useScrollLogoTransition } from '@/hooks/useScrollLogoTransition';
import { ScrollLogoProvider } from '@/contexts/ScrollLogoContext';
import { isSafeUrl } from '@/utils/url';

interface Props {
  content: HeroBannerContent;
}

const DEFAULT_SLIDES: HeroBannerSlide[] = [
  {
    title: '山水',
    subtitle: '흙과 불이 빚어낸 600년의 시간',
    cta_text: '컬렉션 보기',
    cta_url: '/collection',
    bg_color: '#1a1a1a',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1920&q=80',
  },
  {
    title: '茶의 여운',
    subtitle: '세월이 빚어낸 깊은 맛',
    cta_text: '아카이브 보기',
    cta_url: '/archive',
    bg_color: '#1a1a1a',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1920&q=80',
  },
  {
    title: '다석의 시간',
    subtitle: '고요한 찻자리를 위한 다구',
    cta_text: '저널 보기',
    cta_url: '/journal',
    bg_color: '#1a1a1a',
    image_url: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=1920&q=80',
  },
];

interface SliderHeroProps {
  slides: HeroBannerSlide[];
  description?: string;
  sectionRef: React.RefObject<HTMLElement | null>;
  heroLogoStyle: React.CSSProperties;
}

function SliderHero({ slides, description, sectionRef, heroLogoStyle }: SliderHeroProps) {
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

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <section ref={sectionRef} role="region" aria-label="메인 배너" className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, slideIndex) => (
            <div
              key={slideIndex}
              className={cn(
                'relative min-w-full flex items-end overflow-hidden',
                'h-[50svh] min-h-[20rem] md:h-[50svh]',
              )}
              style={{ backgroundColor: slide.bg_color ?? '#1a1a1a' }}
            >
              {slide.image_url && (
                <Image
                  src={slide.image_url}
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

              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

              <div className="absolute left-0 top-0 px-6 pt-6 md:px-12 md:pt-10 select-none pointer-events-none z-20">
                <div style={heroLogoStyle}>
                  <Logo variant="hero" />
                </div>
              </div>

              <div className="relative z-10 w-full px-6 pb-16 md:px-16 md:pb-24 max-w-5xl">
                <p className="typo-label uppercase tracking-[0.35em] text-white/50 mb-6 font-body">
                  옥화당
                </p>
                <h1 className="typo-display text-white">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="mt-6 typo-body text-white/70 max-w-lg tracking-wide">
                    {slide.subtitle}
                  </p>
                )}
                {description && (
                  <div className="mt-6 text-white/60 max-w-lg">
                    <SafeHtml
                      html={description}
                      className="[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white"
                    />
                  </div>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-12">
                    <Link
                      href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}
                      className="inline-block border-b border-white/40 pb-1 typo-body-sm text-white/80 tracking-[0.2em] uppercase hover:border-white hover:text-white transition-all duration-700 ease-out"
                    >
                      {slide.cta_text}
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
        className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 p-3 text-white/40 hover:text-white transition-colors hidden md:block"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={scrollNext}
        aria-label="다음 배너"
        className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 p-3 text-white/40 hover:text-white transition-colors hidden md:block"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 md:bottom-8 right-6 md:right-12 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            className="py-3 group"
          >
            <span
              className={cn(
                'block h-px transition-all duration-500',
                i === selectedIndex ? 'bg-white w-8' : 'bg-white/30 w-4 group-hover:bg-white/60',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HeroBannerBlock({ content }: Props) {
  const { title, subtitle, description, image_url, cta_text, cta_url, template, slides } = content;
  const pathname = usePathname();
  const isHome = pathname === '/';
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
    const resolvedSlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
    return (
      <ScrollLogoProvider value={scrollLogoContextValue}>
        <SliderHero slides={resolvedSlides} description={description} sectionRef={sectionRef} heroLogoStyle={heroLogoStyle} />
      </ScrollLogoProvider>
    );
  }

  if (template === 'split') {
    return (
      <section className="flex flex-col overflow-hidden md:flex-row bg-white">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="typo-h2 text-foreground">{title}</h2>
          {subtitle && <p className="mt-2 typo-body text-muted-foreground">{subtitle}</p>}
          {description && (
            <div className="mt-4 text-muted-foreground">
              <SafeHtml
                html={description}
                className="[&_p]:mt-1 [&_strong]:text-muted-foreground [&_b]:text-muted-foreground"
              />
            </div>
          )}
          {cta_text && cta_url && (
            <Link
              href={isSafeUrl(cta_url) ? cta_url : '#'}
              className="mt-6 inline-block border border-foreground px-6 py-3 typo-button text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              {cta_text}
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
      <section ref={sectionRef} className="relative flex h-[40svh] min-h-[18rem] md:h-[40svh] items-center justify-center overflow-hidden bg-neutral-900">
        {isHome && (
          <div className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20">
            <div style={heroLogoStyle}>
              <Logo variant="hero" />
            </div>
          </div>
        )}
        {image_url && (
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover object-center animate-kenburns"
            priority
            sizes="100vw"
          />
        )}
        {image_url && <div className="absolute inset-0 bg-black/45" />}
        {image_url && <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />}
        <div className={`relative z-10 w-full px-8 md:px-12 ${image_url ? 'text-white' : 'text-foreground'}`}>
          <h1 className={cn('typo-h0 font-display', image_url ? 'text-white' : 'text-foreground')}>{title}</h1>
          {subtitle && <p className={cn('mt-4 typo-body', image_url ? 'text-white/90' : 'text-muted-foreground')}>{subtitle}</p>}
          {description && (
            <div className={cn('mt-4', image_url ? 'text-white/80' : 'text-muted-foreground')}>
              <SafeHtml
                html={description}
                className={image_url ? '[&_p]:mt-1 [&_strong]:text-white [&_b]:text-white' : '[&_p]:mt-1 [&_strong]:text-muted-foreground [&_b]:text-muted-foreground'}
              />
            </div>
          )}
          {cta_text && cta_url && (
            <div className="mt-8">
              <Link
                href={isSafeUrl(cta_url) ? cta_url : '#'}
                className="inline-block rounded-full border border-current px-8 py-3 typo-button tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-700 ease-out"
              >
                {cta_text}
              </Link>
            </div>
          )}
        </div>
      </section>
    </ScrollLogoProvider>
  );
}
