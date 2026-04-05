'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SplitContentContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { isSafeUrl } from '@/utils/url';
import SafeHtml from '@/components/common/SafeHtml';

interface Props {
  content: SplitContentContent;
}

export default function SplitContentBlock({ content }: Props) {
  const {
    title,
    subtitle,
    description,
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

  const bgClass = use_alternate_bg ? 'bg-surface' : 'bg-background';

  return (
    <div ref={sectionRef} className={cn(bgClass)}>
      <div
        className={cn(
          'mx-auto flex flex-col justify-center',
          isLarge ? 'max-w-3xl px-12 py-20 lg:px-20' : isCompact ? 'max-w-2xl px-8 py-14 lg:px-14' : 'max-w-xl px-10 py-16 lg:px-16'
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
          <SafeHtml
            html={description}
            className={cn(
              'animate-fade-in-up typo-body text-muted-foreground prose max-w-none',
              isLarge ? 'mt-5' : 'mt-4',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          />
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
    </div>
  );
}
