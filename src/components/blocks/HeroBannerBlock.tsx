'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import type { HeroBannerContent, HeroBannerSlide } from '@/lib/api';
import { useScrollLogoTransition } from '@/hooks/useScrollLogoTransition';
import { ScrollLogoProvider } from '@/contexts/ScrollLogoContext';
import { isSafeUrl } from '@/utils/url';
import SafeHtml from '@/components/common/SafeHtml';

interface Props {
  content: HeroBannerContent;
}

const DEFAULT_SLIDES: HeroBannerSlide[] = [
  {
    title: '의흥 장인의 손끝에서',
    subtitle: '600년 전통, 정성으로 빚은 자사호의 세계로 초대합니다',
    cta_text: '컬렉션 보기',
    cta_url: '/collection',
    bg_color: '#2A2520',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1920&q=80',
  },
  {
    title: '보이차의 깊은 여운',
    subtitle: '세월이 빚어낸 맛, 시간의 결을 담은 엄선된 보이차',
    cta_text: '아카이브 보기',
    cta_url: '/archive',
    bg_color: '#2A2520',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1920&q=80',
  },
  {
    title: '찻자리의 완성',
    subtitle: '자사호와 다구로 꾸미는 나만의 다석, 고요한 시간의 시작',
    cta_text: '저널 보기',
    cta_url: '/journal',
    bg_color: '#2A2520',
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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });

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
                    slideIndex === selectedIndex && 'animate-kenburns',
                  )}
                  priority={slideIndex === 0}
                  sizes="100vw"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

              {slideIndex === 0 && (
                <div className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20">
                  <div style={heroLogoStyle}>
                    <Logo variant="hero" />
                  </div>
                </div>
              )}

              <div className="relative z-10 w-full px-8 md:px-16 max-w-3xl">
                <p className="typo-label uppercase tracking-[0.35em] text-[#B8976A] mb-4 font-body">
                  {slideIndex === 0 ? '옥화당 茶室' : `0${slideIndex + 1}`}
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
                    <SafeHtml html={description} className="[&_p]:mt-1 [&_strong]:text-white [&_a]:text-[#B8976A] hover:[&_a]:underline" />
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
            aria-label="이전 슬라이드"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="다음 슬라이드"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={`${idx + 1}번 슬라이드로 이동`}
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
      <section className="flex flex-col overflow-hidden md:flex-row bg-card">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="typo-h2 text-foreground">{title}</h2>
          {subtitle && <p className="mt-2 typo-body text-muted-foreground">{subtitle}</p>}
          {description && (
            <div className="mt-4 text-muted-foreground">
              <SafeHtml html={description} />
            </div>
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
        {image_url && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />}
        {image_url && <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />}
        <div className={`relative z-10 w-full px-8 md:px-16 ${image_url ? 'text-white' : 'text-foreground'}`}>
          <h1 className={cn('typo-h0 font-display leading-tight', image_url ? 'text-white' : 'text-foreground')}>{title}</h1>
          {subtitle && <p className={cn('mt-5 typo-body font-display leading-relaxed', image_url ? 'text-white/85' : 'text-muted-foreground')}>{subtitle}</p>}
          {description && (
            <div className={cn('mt-4', image_url ? 'text-white/75' : 'text-muted-foreground')}>
              <SafeHtml html={description} className={image_url ? '[&_p]:mt-1 [&_strong]:text-white [&_a]:text-[#B8976A] hover:[&_a]:underline' : '[&_p]:mt-1'} />
            </div>
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