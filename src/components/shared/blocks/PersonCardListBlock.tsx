'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import type { PersonCardItem, PersonCardListContent } from '@/lib/api';
import { getHeadingId, InlineHtmlText } from './genericBlockUtils';

function PersonCard({ item, reversed }: { item: PersonCardItem; reversed: boolean }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const showImage = Boolean(item.imageUrl && item.imageUrl !== failedImageUrl);

  return (
    <article className={cn('flex flex-col gap-6 md:gap-8 md:items-center', reversed ? 'md:flex-row-reverse' : 'md:flex-row')}>
      {showImage && item.imageUrl && (
        <div className="relative w-full md:w-2/5 aspect-square bg-muted shrink-0 overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
            onError={() => setFailedImageUrl(item.imageUrl)}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {item.title && <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">{item.title}</p>}
        <h3 className="text-base font-medium text-foreground mb-1">{item.name}</h3>
        {(item.region || item.specialty) && <p className="text-xs text-muted-foreground mb-4">{[item.region, item.specialty].filter(Boolean).join(' · ')}</p>}
        <blockquote className="border-t border-border pt-3 mb-4">
          <InlineHtmlText html={item.story} className="text-xs text-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold" />
        </blockquote>
        {item.href && (
          <Link className="editorial-link" href={item.href}>{item.hrefLabel || item.name}</Link>
        )}
      </div>
    </article>
  );
}

function PersonSkeletonCard({ reversed }: { reversed: boolean }) {
  return (
    <div className={cn('flex flex-col gap-6 md:gap-8 md:items-center', reversed ? 'md:flex-row-reverse' : 'md:flex-row')}>
      <SkeletonBox className="w-full md:w-2/5 aspect-square" />
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
    <section className="editorial-section py-8 max-w-5xl mx-auto" aria-labelledby={headingId}>
      <SectionHeading id={headingId} label={content.sectionLabel || ''} title={content.sectionTitle || ''} description={content.sectionDesc} />
      <div className="space-y-10">
        {items.length > 0
          ? items.map((item, index) => <PersonCard key={item.id} item={item} reversed={index % 2 === 1} />)
          : Array.from({ length: 2 }).map((_, index) => <PersonSkeletonCard key={index} reversed={index % 2 === 1} />)}
      </div>
    </section>
  );
}
