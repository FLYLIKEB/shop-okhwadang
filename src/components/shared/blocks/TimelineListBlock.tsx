'use client';

import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import type { TimelineItem, TimelineListContent } from '@/lib/api';
import { getHeadingId, InlineHtmlText } from './genericBlockUtils';

function TimelineCard({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">{item.step}</span>
        {!isLast && <div className="flex-1 w-px bg-border mt-2" aria-hidden="true" />}
      </div>
      <div className="pb-10">
        {item.label && <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">{item.label}</p>}
        <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
        <InlineHtmlText html={item.description} className="text-sm text-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold" />
      </div>
    </article>
  );
}

function TimelineSkeletonCard() {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <SkeletonBox width="w-10 h-10 !rounded-full" />
        <SkeletonBox width="w-px flex-1 mt-2" className="min-h-20" />
      </div>
      <div className="pb-10 space-y-3 flex-1">
        <SkeletonBox width="w-32 h-3" />
        <SkeletonBox width="w-40 h-6" />
        <SkeletonBox width="w-full h-4" />
      </div>
    </article>
  );
}

export default function TimelineListBlock({ content }: { content: TimelineListContent }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const headingId = getHeadingId('timeline-list-heading', content.sectionTitle);

  return (
    <section className="py-20 px-4 max-w-3xl mx-auto" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label={content.sectionLabel || ''} title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div>
        {items.length > 0
          ? items.map((item, index) => <TimelineCard key={item.id} item={item} isLast={index === items.length - 1} />)
          : Array.from({ length: 4 }).map((_, index) => <TimelineSkeletonCard key={index} />)}
      </div>
    </section>
  );
}
