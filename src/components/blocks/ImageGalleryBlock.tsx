'use client';

import Image from 'next/image';
import type { ImageGalleryContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface Props {
  content: ImageGalleryContent;
}

export default function ImageGalleryBlock({ content }: Props) {
  const {
    title,
    images = [],
    template = 'grid',
    columns = 3,
  } = content;

  if (images.length === 0) return null;

  if (template === 'carousel') {
    return (
      <section className="py-12 bg-background">
        {title && (
          <h2 className="text-center text-2xl font-medium mb-8">{title}</h2>
        )}
        <div className="flex gap-6 overflow-x-auto pb-4 px-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="shrink-0 w-72 relative group"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={image.url}
                  alt={image.alt || `Gallery image ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="288px"
                />
              </div>
              {image.caption && (
                <p className="mt-3 text-sm text-muted-foreground text-center">{image.caption}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background">
      {title && (
        <h2 className="text-center text-2xl font-medium mb-8">{title}</h2>
      )}
      <div className={cn(
        'grid gap-4 px-6',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
        template === 'masonry' && 'columns-1 sm:columns-2 md:columns-3'
      )}>
        {images.map((image, index) => (
          <div
            key={index}
            className={cn(
              'relative group',
              template === 'masonry' && 'break-inside-avoid mb-4'
            )}
          >
            <div className={cn(
              'relative overflow-hidden',
              template === 'masonry' ? 'aspect-auto' : 'aspect-square'
            )}>
              <Image
                src={image.url}
                alt={image.alt || `Gallery image ${index + 1}`}
                fill
                className={cn(
                  'object-cover transition-transform duration-500',
                  !template && 'group-hover:scale-105'
                )}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            {image.caption && (
              <p className="mt-2 text-sm text-muted-foreground">{image.caption}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
