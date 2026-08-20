import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import type { PersonCardItem, PersonCardListContent } from '@/lib/api';
import { getHeadingId, InlineHtmlText } from './genericBlockUtils';
import { Button } from '@/components/ui/button';

function PersonCard({ item, reversed }: { item: PersonCardItem; reversed: boolean }) {
  return (
    <article className={cn('flex flex-col gap-8 md:gap-12 md:items-center', reversed ? 'md:flex-row-reverse' : 'md:flex-row')}>
      <div className="relative w-full md:w-2/5 aspect-square rounded-lg bg-muted shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-muted-foreground/30">{item.name.slice(0, 1)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {item.title && <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">{item.title}</p>}
        <h3 className="text-2xl font-bold text-foreground mb-1">{item.name}</h3>
        {(item.region || item.specialty) && <p className="text-xs text-muted-foreground mb-4">{[item.region, item.specialty].filter(Boolean).join(' · ')}</p>}
        <blockquote className="border-l-2 border-foreground pl-4 mb-6">
          <InlineHtmlText html={item.story} className="text-sm text-foreground leading-relaxed italic [&_b]:font-semibold [&_strong]:font-semibold" />
        </blockquote>
        {item.href && (
          <Button asChild variant="gray" size="sm">
            <Link href={item.href}>{item.hrefLabel || item.name}</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function PersonSkeletonCard({ reversed }: { reversed: boolean }) {
  return (
    <div className={cn('flex flex-col gap-8 md:gap-12 md:items-center', reversed ? 'md:flex-row-reverse' : 'md:flex-row')}>
      <SkeletonBox className="w-full md:w-2/5 aspect-square !rounded-lg" />
      <div className="flex-1 min-w-0 space-y-4">
        <SkeletonBox width="w-32 h-3" />
        <SkeletonBox width="w-40 h-8" />
        <SkeletonBox width="w-48 h-4" />
        <SkeletonBox width="w-full h-4" />
      </div>
    </div>
  );
}

export default function PersonCardListBlock({ content }: { content: PersonCardListContent }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const headingId = getHeadingId('person-card-list-heading', content.sectionTitle);

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label={content.sectionLabel || ''} title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className="space-y-20">
        {items.length > 0
          ? items.map((item, index) => <PersonCard key={item.id} item={item} reversed={index % 2 === 1} />)
          : Array.from({ length: 2 }).map((_, index) => <PersonSkeletonCard key={index} reversed={index % 2 === 1} />)}
      </div>
    </section>
  );
}
