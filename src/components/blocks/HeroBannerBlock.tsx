'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import Logo from '@/components/Logo';
import type { HeroBannerContent, HeroBannerSlide } from '@/lib/api';

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

function useHeroLogo(sectionRef: React.RefObject<HTMLElement | null>) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const bottom = el.getBoundingClientRect().bottom;
      const fadeStart = window.innerHeight * 0.5;
      const fadeEnd = window.innerHeight * 0.15;
      if (bottom >= fadeStart) setOpacity(1);
      else if (bottom <= fadeEnd) setOpacity(0);
      else setOpacity((bottom - fadeEnd) / (fadeStart - fadeEnd));

      const isPast = bottom < 56;
      document.dispatchEvent(new CustomEvent('hero-visibility', { detail: { isPast } }));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionRef]);

  return opacity;
}

function SliderHero({ slides, sectionRef, logoOpacity }: {
  slides: HeroBannerSlide[];
  sectionRef: React.RefObject<HTMLElement | null>;
  logoOpacity: number;
}) {
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
                'h-[60vh] min-h-[400px] md:h-[80vh] md:min-h-[560px]',
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

              <div className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20">
                <div style={{ opacity: logoOpacity, transition: 'opacity 0.1s linear' }}>
                  <Logo variant="hero" />
                </div>
              </div>

              <div className="relative z-10 w-full px-8 md:px-12 max-w-3xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3 font-body">
                  옥화당 공식 쇼핑몰
                </p>
                <h2 className="text-4xl md:text-6xl font-display-ko tracking-tight text-white leading-tight">
                  {slide.title}
                </h2>
                {slide.subtitle && (
                  <p className="mt-4 text-base md:text-lg text-white/80">
                    {slide.subtitle}
                  </p>
                )}
                {slide.cta_text && slide.cta_url && (
                  <div className="mt-8">
                    <Link
                      href={slide.cta_url}
                      className="inline-block rounded-full border border-white px-8 py-3 text-sm font-medium text-white tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
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
              'min-h-[44px] min-w-[44px] flex-1 max-w-8 h-1.5 rounded-full transition-all flex items-center justify-center',
              i === selectedIndex ? 'bg-white' : 'bg-white/40',
            )}
          />
        ))}
      </div>
    </section>
  );
}

export default function HeroBannerBlock({ content }: Props) {
  const { title, subtitle, image_url, cta_text, cta_url, template, slides } = content;
  const pathname = usePathname();
  const isHome = pathname === '/';
  const sectionRef = useRef<HTMLElement>(null);
  const logoOpacity = useHeroLogo(sectionRef);

  if (template === 'slider') {
    const resolvedSlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
    return <SliderHero slides={resolvedSlides} sectionRef={sectionRef} logoOpacity={logoOpacity} />;
  }

  if (template === 'split') {
    return (
      <section className="flex flex-col overflow-hidden md:flex-row bg-white">
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          {cta_text && cta_url && (
            <Link
              href={cta_url}
              className="mt-6 inline-block border border-foreground px-6 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
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

  // fullscreen (default)
  return (
    <section ref={sectionRef} className="relative flex h-[60vh] min-h-[400px] md:h-[80vh] items-center justify-center overflow-hidden bg-neutral-900">
      {isHome && (
        <div
          className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20"
          style={{ opacity: logoOpacity, transition: 'opacity 0.1s linear' }}
        >
          <Logo variant="hero" />
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
      <div className={`relative z-10 w-full px-8 md:px-12 ${image_url ? 'text-white' : ''}`}>
        <h2 className="text-3xl md:text-5xl">{title}</h2>
        {subtitle && <p className="mt-4 text-lg opacity-80">{subtitle}</p>}
        {cta_text && cta_url && (
          <div className="mt-8">
            <Link
              href={cta_url}
              className="inline-block rounded-full border border-current px-8 py-3 text-sm font-medium tracking-widest uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
            >
              {cta_text}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
