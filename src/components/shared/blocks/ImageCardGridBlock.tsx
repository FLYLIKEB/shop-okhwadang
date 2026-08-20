import Image from 'next/image';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { cn } from '@/components/ui/utils';
import type { ImageCardGridContent, ImageCardItem } from '@/lib/api';
import { getHeadingId, InlineHtmlText } from './genericBlockUtils';
import { ContentCardShell, ContentCardSkeleton } from './ContentCardShell';

function gridClass(columns: ImageCardGridContent['columns']) {
  switch (columns) {
    case 2:
      return 'lg:grid-cols-2';
    case 4:
      return 'lg:grid-cols-4';
    case 3:
    default:
      return 'lg:grid-cols-3';
  }
}

function ImageCard({ item, columns }: { item: ImageCardItem; columns: ImageCardGridContent['columns'] }) {
  const body = (
    <>
      <div className="relative h-40 bg-muted overflow-hidden">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes={columns === 4 ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">{item.name}</div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground mb-1">{item.name}</h3>
        <InlineHtmlText html={item.description} className="text-sm text-muted-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold [&_b]:text-foreground [&_strong]:text-foreground" />
        {item.href && <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">{item.hrefLabel || item.name}</span>}
      </div>
    </>
  );

  return <ContentCardShell href={item.href}>{body}</ContentCardShell>;
}

export default function ImageCardGridBlock({ content }: { content: ImageCardGridContent }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const columns = content.columns ?? 3;
  const headingId = getHeadingId('image-card-grid-heading', content.sectionTitle);

  return (
    <section className="py-20 px-4 max-w-6xl mx-auto" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label={content.sectionLabel || ''} title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-6', gridClass(columns))} data-columns={columns}>
        {items.length > 0
          ? items.map((item) => <ImageCard key={item.id} item={item} columns={columns} />)
          : Array.from({ length: columns }).map((_, index) => <ContentCardSkeleton key={index} variant="image" />)}
      </div>
    </section>
  );
}
