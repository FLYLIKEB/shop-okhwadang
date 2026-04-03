'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { SplitContentContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { isSafeUrl } from '@/utils/url';

interface Props {
  content: SplitContentContent;
}

export default function SplitContentBlock({ content }: Props) {
  const {
    title,
    subtitle,
    description,
    image_url,
    image_position = 'left',
    cta_text,
    cta_url,
    template = 'default',
    use_alternate_bg = false,
  } = content;

  const isLarge = template === 'large';
  const isCompact = template === 'compact';

  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bgClass = use_alternate_bg ? 'bg-[#F5F3EF]' : 'bg-white';

  const gridCols = isLarge
    ? 'grid-cols-1 lg:grid-cols-[5fr_7fr]'
    : isCompact
      ? 'grid-cols-1 lg:grid-cols-[5fr_7fr]'
      : 'grid-cols-1 lg:grid-cols-[5fr_7fr]';

  return (
    <div ref={sectionRef}>
      <section
        className={cn(
          'grid overflow-hidden',
          gridCols,
          bgClass,
          image_position === 'right' && 'lg:[&>*:first-child]:order-last'
        )}
      >
        {image_url && (
          <div
            className={cn(
              'relative overflow-hidden',
              isLarge ? 'min-h-80 lg:min-h-[30rem]' : isCompact ? 'min-h-48 lg:min-h-[28rem]' : 'min-h-64 lg:min-h-[32rem]'
            )}
          >
            <Image
              src={image_url}
              alt={title}
              fill
              className={cn(
                'object-cover transition-transform duration-[4000ms] ease-out',
                isVisible ? 'scale-100' : 'scale-[1.02]'
              )}
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent" />
          </div>
        )}
        <div
          className={cn(
            'flex flex-col justify-center',
            isLarge ? 'p-12 lg:p-20' : isCompact ? 'p-8 lg:p-14' : 'p-10 lg:p-16'
          )}
        >
          {subtitle && (
            <p
              className={cn(
                'animate-fade-in-up typo-label uppercase tracking-[0.2em] text-muted-foreground',
                isLarge ? 'mb-5' : 'mb-4',
                isVisible ? 'opacity-100' : 'opacity-0'
              )}
              style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
              {subtitle}
            </p>
          )}
          <h2
            className={cn(
              'animate-fade-in-up font-display text-foreground',
              isLarge
                ? 'text-3xl lg:text-4xl'
                : isCompact
                  ? 'text-xl lg:text-2xl'
                  : 'text-2xl lg:text-3xl',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                'animate-fade-in-up typo-body text-muted-foreground',
                isLarge ? 'mt-5 max-w-md' : 'mt-4 max-w-sm',
                isVisible ? 'opacity-100' : 'opacity-0'
              )}
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              {description}
            </p>
          )}
          {cta_text && cta_url && (
            <div
              className={cn(
                'animate-fade-in-up',
                isVisible ? 'opacity-100' : 'opacity-0'
              )}
              style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            >
              <Link
                href={isSafeUrl(cta_url) ? cta_url : '#'}
                className={cn(
                  'group inline-flex items-center gap-2 font-medium text-foreground',
                  isLarge ? 'mt-8 text-sm' : 'mt-6 text-sm'
                )}
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
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
