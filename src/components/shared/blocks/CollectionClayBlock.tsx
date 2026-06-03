'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { collectionsApi } from '@/lib/api';
import type { Collection, CollectionsResponse, SectionHeadingBlockContent } from '@/lib/api';
import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import { getSectionText } from './archiveCollectionSection';

interface CollectionClayContent extends SectionHeadingBlockContent {
  prefetchedCollections?: CollectionsResponse;
}

function CollectionDescription({ description }: { description: string | null }) {
  const sanitized = sanitizeInlineHtml(description);
  if (!sanitized) return null;

  return (
    <div
      className="text-sm text-muted-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold [&_b]:text-foreground [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function ClayCard({
  collection,
  cta,
  colorAria,
}: {
  collection: Collection;
  cta: string;
  colorAria: (name: string) => string;
}) {
  const displayName = collection.nameKo ?? collection.name;
  return (
    <Link
      href={collection.productUrl}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div
        className="h-40 transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: collection.color ?? '#888' }}
        role="img"
        aria-label={colorAria(displayName)}
      />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: collection.color ?? '#888' }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {collection.name}
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {displayName}
        </h3>
        <CollectionDescription description={collection.description} />
        <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
          {cta}
        </span>
      </div>
    </Link>
  );
}

function ClaySkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <SkeletonBox height="h-40" className="!rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonBox width="w-2.5 h-2.5" className="!rounded-full" />
          <SkeletonBox width="w-20 h-3" />
        </div>
        <SkeletonBox width="w-32 h-5" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-3/4 h-4" />
        <SkeletonBox width="w-24 h-4 mt-4" />
      </div>
    </div>
  );
}

export default function CollectionClayBlock({ content }: { content: CollectionClayContent }) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('collectionPage');
  const section = getSectionText(content, {
    label: t('clayLabel'),
    title: t('clayTitle'),
    description: t('clayDesc'),
  });
  const { data: clayCollections, loading } = useBlockData<Collection>({
    prefetched: content.prefetchedCollections?.clay,
    fetch: async () => {
      const data = await collectionsApi.getAll(locale);
      return data.clay;
    },
    deps: [locale],
  });

  return (
    <section
      className="py-20 px-4 max-w-6xl mx-auto"
      aria-labelledby="clay-collection-heading"
    >
      <SectionHeading
        id="clay-collection-heading"
        label={section.label}
        title={section.title}
        description={section.description}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && clayCollections.length > 0
          ? clayCollections.map((clay) => (
              <ClayCard
                key={clay.id}
                collection={clay}
                cta={t('cardCta')}
                colorAria={(name) => t('colorAria', { name })}
              />
            ))
          : Array.from({ length: 6 }).map((_, index) => <ClaySkeletonCard key={index} />)}
      </div>
    </section>
  );
}
