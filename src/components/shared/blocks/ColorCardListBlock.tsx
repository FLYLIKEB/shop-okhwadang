'use client';

import Link from 'next/link';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import type { ColorCardItem, ColorCardListContent } from '@/lib/api';
import { getHeadingId, InlineHtmlText } from './genericBlockUtils';

function AlternatingCard({ item, reversed }: { item: ColorCardItem; reversed: boolean }) {
  const displayName = item.name ?? item.nameKo;

  return (
    <article
      className={cn(
        'flex flex-col gap-8 md:gap-12 md:items-center',
        reversed ? 'md:flex-row-reverse' : 'md:flex-row',
      )}
    >
      <div
        className="w-full md:w-2/5 aspect-square rounded-lg shrink-0"
        style={{ backgroundColor: item.color }}
        role="img"
        aria-label={displayName}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.nameEn && <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{item.nameEn}</span>}
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{displayName}</h3>
        {item.region && <p className="text-xs text-muted-foreground mb-4">{item.region}</p>}
        <InlineHtmlText html={item.description} className="text-sm text-foreground leading-relaxed mb-6 [&_b]:font-semibold [&_strong]:font-semibold" />
        {item.characteristics && item.characteristics.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 mb-6">
            {item.characteristics.map((characteristic) => (
              <li key={characteristic} className="text-xs text-muted-foreground border border-border rounded px-3 py-1.5">
                {characteristic}
              </li>
            ))}
          </ul>
        )}
        {item.href && (
          <Link href={item.href} className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-foreground rounded px-4 py-2 hover:bg-foreground hover:text-background transition-colors">
            {item.hrefLabel || displayName}
          </Link>
        )}
      </div>
    </article>
  );
}

function GridCard({ item }: { item: ColorCardItem }) {
  const displayName = item.name ?? item.nameKo;

  const body = (
    <>
      <div className="h-40 transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: item.color }} role="img" aria-label={displayName} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.nameEn && <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{item.nameEn}</span>}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">{displayName}</h3>
        <InlineHtmlText html={item.description} className="text-sm text-muted-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold [&_b]:text-foreground [&_strong]:text-foreground" />
        {item.href && <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">{item.hrefLabel || displayName}</span>}
      </div>
    </>
  );

  if (!item.href) {
    return <article className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg">{body}</article>;
  }

  return <Link href={item.href} className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg">{body}</Link>;
}

function SkeletonCards({ layout }: { layout: ColorCardListContent['layout'] }) {
  if (layout === 'grid-3') {
    return Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="rounded-lg border border-border bg-background overflow-hidden">
        <SkeletonBox height="h-40" className="!rounded-none" />
        <div className="p-5 space-y-3">
          <SkeletonBox width="w-24 h-3" />
          <SkeletonBox width="w-32 h-5" />
          <SkeletonBox width="w-full h-4" />
        </div>
      </div>
    ));
  }

  return Array.from({ length: 2 }).map((_, index) => (
    <div key={index} className={cn('flex flex-col gap-8 md:gap-12 md:items-center', index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row')}>
      <SkeletonBox className="w-full md:w-2/5 aspect-square !rounded-lg" />
      <div className="flex-1 min-w-0 space-y-4">
        <SkeletonBox width="w-24 h-3" />
        <SkeletonBox width="w-40 h-8" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-full h-4" />
      </div>
    </div>
  ));
}

export default function ColorCardListBlock({ content }: { content: ColorCardListContent }) {
  const layout = content.layout ?? 'alternating';
  const items = Array.isArray(content.items) ? content.items : [];
  const headingId = getHeadingId('color-card-list-heading', content.sectionTitle);

  return (
    <section className={cn('py-20 px-4 mx-auto', layout === 'grid-3' ? 'max-w-6xl' : 'max-w-5xl')} aria-labelledby={headingId}>
      <SectionHeading id={headingId} label={content.sectionLabel || ''} title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className={layout === 'grid-3' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-20'}>
        {items.length > 0
          ? items.map((item, index) => layout === 'grid-3'
            ? <GridCard key={item.id} item={item} />
            : <AlternatingCard key={item.id} item={item} reversed={index % 2 === 1} />)
          : <SkeletonCards layout={layout} />}
      </div>
    </section>
  );
}
