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
  } = content;

  const isLarge = template === 'large';
  const isCompact = template === 'compact';

  const imageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={cn(
        'grid grid-cols-1 overflow-hidden bg-white md:grid-cols-2',
        image_position === 'right' && 'md:[&>*:first-child]:order-last'
      )}
    >
      {image_url && (
        <div
          ref={imageRef}
          className={cn(
            'relative transition-opacity duration-700 ease-in',
            isLarge ? 'min-h-80 md:min-h-[30rem]' : isCompact ? 'min-h-48 md:min-h-64' : 'min-h-64 md:min-h-96',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
      <div
        className={cn(
          'flex flex-col justify-center',
          isLarge ? 'p-12 md:p-20' : isCompact ? 'p-6 md:p-10' : 'p-8 md:p-16'
        )}
      >
        {subtitle && (
          <p
            className={cn(
              'uppercase tracking-widest text-muted-foreground',
              isLarge ? 'mb-4 text-sm' : 'mb-3 text-xs'
            )}
          >
            {subtitle}
          </p>
        )}
        <h2
          className={cn(
            'font-medium text-foreground',
            isLarge
              ? 'text-3xl md:text-4xl'
              : isCompact
                ? 'text-xl md:text-2xl'
                : 'text-2xl md:text-3xl'
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-4 leading-relaxed text-muted-foreground',
              isLarge ? 'max-w-xl text-base md:text-lg' : 'text-sm md:text-base'
            )}
          >
            {description}
          </p>
        )}
        {cta_text && cta_url && (
          <Link
            href={isSafeUrl(cta_url) ? cta_url : '#'}
            className={cn(
              'mt-6 inline-block border border-foreground font-medium text-foreground transition-colors hover:bg-foreground hover:text-background',
              isLarge ? 'px-8 py-3 text-sm' : 'px-6 py-2.5 text-sm'
            )}
          >
            {cta_text}
          </Link>
        )}
      </div>
    </section>
  );
}
