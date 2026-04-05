'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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

/* ── Scroll Storytelling Section ──────────────────────────────── */

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

interface StorytellingHeroProps {
  slides: HeroBannerSlide[];
  description?: string;
  sectionRef: React.RefObject<HTMLElement | null>;
  heroLogoStyle: React.CSSProperties;
}

function StorytellingHero({ slides, description, sectionRef, heroLogoStyle }: StorytellingHeroProps) {
  return (
    <section ref={sectionRef} role="region" aria-label="메인 배너">
      {slides.map((slide, i) => (
        <StorytellingSlide
          key={i}
          slide={slide}
          index={i}
          isFirst={i === 0}
          description={i === 0 ? description : undefined}
          heroLogoStyle={heroLogoStyle}
        />
      ))}
    </section>
  );
}

interface StorytellingSlideProps {
  slide: HeroBannerSlide;
  index: number;
  isFirst: boolean;
  description?: string;
  heroLogoStyle: React.CSSProperties;
}

function StorytellingSlide({ slide, index, isFirst, description, heroLogoStyle }: StorytellingSlideProps) {
  const { ref, isVisible } = useInView(0.2);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        'h-[40svh] md:h-svh min-h-[30rem]',
      )}
      style={{ backgroundColor: slide.bg_color ?? '#2A2520' }}
    >
      {slide.image_url && (
        <Image
          src={slide.image_url}
          alt={slide.title}
          fill
          className={cn(
            'object-cover object-center transition-transform duration-[2s] ease-out',
            isVisible ? 'scale-100' : 'scale-110',
          )}
          priority={isFirst}
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {isFirst && (
        <div className="absolute left-0 top-0 px-6 pt-6 select-none pointer-events-none z-20">
          <div style={heroLogoStyle}>
            <Logo variant="hero" />
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative z-10 w-full px-8 md:px-16 max-w-3xl transition-all duration-1000 ease-out',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12',
        )}
        style={{ transitionDelay: '200ms' }}
      >
        <p
          className="typo-label uppercase tracking-[0.35em] text-[#B8976A] mb-4 font-body transition-all duration-700 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '100ms',
          }}
        >
          {index === 0 ? '옥화당 茶室' : `0${index + 1}`}
        </p>
        <h1 className="typo-h0 font-display text-white leading-tight">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p
            className="mt-5 typo-body text-white/85 font-display leading-relaxed transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '400ms',
            }}
          >
            {slide.subtitle}
          </p>
        )}
        {description && (
          <div className="mt-4 text-white/75">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
          </div>
        )}
        {slide.cta_text && slide.cta_url && (
          <div
            className="mt-10 transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '600ms',
            }}
          >
            <Link
              href={isSafeUrl(slide.cta_url) ? slide.cta_url : '#'}
              className="inline-block border border-[#B8976A] px-10 py-3.5 typo-button text-[#B8976A] tracking-[0.15em] uppercase hover:bg-[#B8976A] hover:text-white transition-colors duration-300"
            >
              {slide.cta_text}
            </Link>
          </div>
        )}
      </div>

      {/* Scroll indicator on first slide */}
      {isFirst && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-fade-in-up">
          <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-bounce">
            <path d="M8 4v16M3 15l5 5 5-5" />
          </svg>
        </div>
      )}
    </div>
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
        <StorytellingHero slides={resolvedSlides} description={description} sectionRef={sectionRef} heroLogoStyle={heroLogoStyle} />
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
      <section ref={sectionRef} className="relative flex h-[60svh] min-h-[25rem] md:h-[80svh] items-center justify-center overflow-hidden bg-neutral-900">
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
            </div>
          )}
          {cta_text && cta_url && (
            <div className="mt-10">
              <Link
                href={isSafeUrl(cta_url) ? cta_url : '#'}
                className={cn(
                  'inline-block px-10 py-3.5 typo-button tracking-[0.15em] uppercase transition-colors duration-300',
                  image_url
                    ? 'border border-[#B8976A] text-[#B8976A] hover:bg-[#B8976A] hover:text-white'
                    : 'border border-foreground text-foreground hover:bg-foreground hover:text-background',
                )}
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
