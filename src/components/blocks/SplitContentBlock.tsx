'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SplitContentContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface Props {
  content: SplitContentContent;
}

export default function SplitContentBlock({ content }: Props) {
  const {
    title,
    subtitle,
    description,
    image_url,
    image_position = 'right',
    cta_text,
    cta_url,
    template = 'default',
  } = content;

  const isLarge = template === 'large';
  const isCompact = template === 'compact';

  return (
    <section className={cn(
      'flex flex-col overflow-hidden bg-white',
      isLarge ? 'md:flex-row' : 'md:flex-row',
      image_position === 'left' && 'md:flex-row-reverse'
    )}>
      <div className={cn(
        'flex flex-col justify-center',
        isLarge ? 'flex-1 p-12 md:p-20' : isCompact ? 'flex-1 p-6 md:p-10' : 'flex-1 p-8 md:p-16'
      )}>
        {subtitle && (
          <p className={cn(
            'text-muted-foreground tracking-widest uppercase',
            isLarge ? 'text-sm mb-4' : 'text-xs mb-3'
          )}>
            {subtitle}
          </p>
        )}
        <h2 className={cn(
          'font-medium text-foreground',
          isLarge ? 'text-3xl md:text-4xl' : isCompact ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'
        )}>
          {title}
        </h2>
        {description && (
          <p className={cn(
            'mt-4 text-muted-foreground leading-relaxed',
            isLarge ? 'text-base md:text-lg max-w-xl' : 'text-sm md:text-base'
          )}>
            {description}
          </p>
        )}
        {cta_text && cta_url && (
          <Link
            href={cta_url}
            className={cn(
              'mt-6 inline-block border border-foreground text-foreground font-medium transition-colors hover:bg-foreground hover:text-background',
              isLarge ? 'px-8 py-3 text-sm' : 'px-6 py-2.5 text-sm'
            )}
          >
            {cta_text}
          </Link>
        )}
      </div>
      {image_url && (
        <div className={cn(
          'relative',
          isLarge ? 'flex-1 min-h-80 md:min-h-96' : 'flex-1 min-h-64 md:min-h-80'
        )}>
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
    </section>
  );
}
