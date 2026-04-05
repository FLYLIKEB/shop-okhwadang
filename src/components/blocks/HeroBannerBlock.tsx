'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    title: '의흥 장인의 손끝에서',
    subtitle: '600년 전통, 정성으로 빚은 자사호를 만나보세요',
    cta_text: '컬렉션 보기',
    cta_url: '/collection',
    bg_color: '#1B3A4B',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1920&q=80',
  },
  {
    title: '보이차의 깊은 여운',
    subtitle: '세월이 빚어낸 맛, 엄선된 보이차 컬렉션',
    cta_text: '아카이브 보기',
    cta_url: '/archive',
    bg_color: '#4A6741',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1920&q=80',
  },
  {
    title: '찻자리의 완성',
    subtitle: '자사호와 다구로 꾸미는 나만의 다석',
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
                'relative min-w-full flex items-center justify-center overflow-hidden',
                'h-[60svh] min-h-[25rem] md:h-[60svh] md:min-h-[30rem]',
              )}
              style={{ backgroundColor: slide.bg_color ?? '#1B3A4B' }}
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

              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

              <div className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20">
                <div style={heroLogoStyle}>
                  <Logo variant="hero" />
                </div>
              </div>

              {/* 세로쓰기 한자 장식 — 우측 */}
              <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-1 select-none pointer-events-none">
                <span className="font-display text-white/20 text-2xl" style={{ writingMode: 'vertical-rl' }}>
                  玉華堂
                </span>
                <span className="w-px h-12 bg-white/15" />
                <span className="font-mono text-white/15 text-xs tracking-widest" style={{ writingMode: 'vertical-rl' }}>
                  工房
                </span>
              </div>

              <div className="relative z-10 w-full px-8 md:px-12 max-w-3xl">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/60 mb-3">
                  옥화당 공식 쇼핑몰
                </p>
                <h1 className="typo-h0 font-display text-white">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="mt-4 typo-body text-white/90">
                    {slide.subtitle}
                  </p>
                )}
                {description && (
                  <div className="mt-4 text-white/80">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                  </div>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-8">
                    <Link
                      href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}
                      className="inline-block border border-white/80 px-8 py-3 font-mono text-xs text-white tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
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
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:opacity-60 transition-opacity hidden md:block"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={scrollNext}
        aria-label="다음 배너"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:opacity-60 transition-opacity hidden md:block"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            className={cn(
              'w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300',
              i === selectedIndex ? 'bg-white w-4 md:w-6' : 'bg-white/50',
            )}
          />
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
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
      <section ref={sectionRef} className="relative flex h-[60svh] min-h-[25rem] md:h-[60svh] md:min-h-[30rem] items-center justify-center overflow-hidden bg-neutral-900">
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
            </div>
          )}
          {cta_text && cta_url && (
            <div className="mt-8">
              <Link
                href={isSafeUrl(cta_url) ? cta_url : '#'}
                className="inline-block rounded-full border border-current px-8 py-3 typo-button tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
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
