'use client';

import Image from 'next/image';
import { cn } from '@/components/ui/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface BrandStoryContent {
  title?: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  bg_color?: string;
}

export interface BrandStoryBlockProps {
  content: BrandStoryContent;
  template?: 'centered' | 'offset' | 'minimal';
}

export default function BrandStoryBlock({ content, template = 'centered' }: BrandStoryBlockProps) {
  const {
    title = '器',
    subtitle,
    description,
    image_url,
    bg_color,
  } = content;

  const { ref, visible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
    once: true,
  });

  const isCentered = template === 'centered';
  const isOffset = template === 'offset';
  const isMinimal = template === 'minimal';

  return (
    <section
      ref={ref}
      className="relative w-full h-[70vh] min-h-[500px] overflow-hidden"
    >
      {image_url && (
        <Image
          src={image_url}
          alt=""
          fill
          className="object-cover"
          priority={false}
          sizes="100vw"
        />
      )}

      {!image_url && bg_color && (
        <div className="absolute inset-0" style={{ backgroundColor: bg_color }} />
      )}

      <div className="absolute inset-0 bg-black/50" />

      <div
        className={cn(
          'absolute inset-0 flex flex-col',
          isCentered && 'items-center justify-center text-center',
          isOffset && 'items-start justify-end pl-12 pb-20 text-left',
          isMinimal && 'items-center justify-center text-center'
        )}
      >
        <div
          className={cn(
            'absolute font-display text-white select-none pointer-events-none',
            'transition-opacity duration-1000 ease-out',
            visible ? 'opacity-[0.10]' : 'opacity-0',
            isCentered && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] leading-none',
            isOffset && 'top-1/2 right-[10%] -translate-y-1/2 text-[35vw] leading-none',
            isMinimal && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] leading-none'
          )}
          aria-hidden="true"
        >
          {title}
        </div>

        <div
          className={cn(
            'relative z-10 flex flex-col',
            isCentered && 'items-center max-w-xl px-8',
            isOffset && 'items-start max-w-md px-4',
            isMinimal && 'items-center max-w-lg px-8'
          )}
        >
          {subtitle && (
            <p
              className={cn(
                'animate-fade-in-up typo-label uppercase tracking-[0.2em] text-white/80',
                'transition-opacity duration-700 ease-out',
                visible ? 'opacity-100' : 'opacity-0'
              )}
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              {subtitle}
            </p>
          )}

          {description && (
            <p
              className={cn(
                'animate-fade-in-up font-display text-white',
                'transition-opacity duration-700 ease-out',
                isCentered && 'text-xl lg:text-2xl mt-4 leading-relaxed',
                isOffset && 'text-lg lg:text-xl mt-3 leading-relaxed',
                isMinimal && 'text-lg mt-4 leading-relaxed',
                visible ? 'opacity-100' : 'opacity-0'
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
