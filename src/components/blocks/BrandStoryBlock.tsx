'use client';

import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { BrandStoryContent } from '@/lib/api';

interface BrandStoryBlockProps {
  content: BrandStoryContent;
  template?: 'centered' | 'offset' | 'minimal';
}

export default function BrandStoryBlock({ content, template = 'centered' }: BrandStoryBlockProps) {
  const { ref, visible } = useScrollAnimation<HTMLElement>();
  const { title, subtitle, description, image_url, bg_color } = content;

  return (
    <section
      ref={ref}
      className="relative w-full h-[70vh] min-h-[500px] overflow-hidden"
      style={{ backgroundColor: bg_color ?? '#1a1a1a' }}
    >
      {image_url && (
        <Image
          src={image_url}
          alt={title ?? 'Brand story'}
          fill
          className="object-cover"
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 bg-black/50" />

      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center text-white px-8',
          template === 'offset' && 'items-start justify-end pb-20 pl-12 md:pl-20',
          template === 'minimal' && 'justify-center',
        )}
      >
        <p
          className={cn(
            'font-display text-[40vw] leading-none text-white select-none',
            template === 'centered' && 'opacity-[0.10]',
            template === 'offset' && 'opacity-[0.08] text-[50vw]',
            template === 'minimal' && 'opacity-[0.06] text-[60vw]',
          )}
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          aria-hidden="true"
        >
          {title ?? '器'}
        </p>
      </div>

      <div
        className={cn(
          'absolute inset-0 flex flex-col text-white',
          template === 'centered' && 'items-center justify-center text-center',
          template === 'offset' && 'items-start justify-end pb-24 pl-8 pr-8 md:pl-16 md:pb-32',
          template === 'minimal' && 'items-center justify-center text-center px-12',
        )}
      >
        <div
          className={cn(
            'flex flex-col',
            template === 'centered' && 'max-w-2xl items-center',
            template === 'offset' && 'items-start max-w-xl',
            template === 'minimal' && 'items-center',
          )}
        >
          {subtitle && (
            <p
              className={cn(
                'animate-fade-in-up typo-label uppercase tracking-[0.2em] text-white/70 mb-4 md:mb-6',
                visible ? 'opacity-100' : 'opacity-0',
              )}
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              {subtitle}
            </p>
          )}
          {description && (
            <p
              className={cn(
                'animate-fade-in-up font-display text-white/90 leading-relaxed',
                template === 'centered' && 'text-xl md:text-2xl',
                template === 'offset' && 'text-lg md:text-xl',
                template === 'minimal' && 'text-base md:text-lg',
                visible ? 'opacity-100' : 'opacity-0',
              )}
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
