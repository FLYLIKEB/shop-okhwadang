'use client';

import Image from 'next/image';
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

interface CollectionShapeContent extends SectionHeadingBlockContent {
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

function ShapeCard({
  collection,
  cta,
  shapeAria,
}: {
  collection: Collection;
  cta: string;
  shapeAria: (name: string) => string;
}) {
  return (
    <Link
      href={collection.productUrl}
      className="group block rounded-lg border border-border bg-background overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-40 bg-muted overflow-hidden">
        {collection.imageUrl ? (
          <Image
            src={collection.imageUrl}
            alt={shapeAria(collection.name)}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {collection.name}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground mb-1">
          {collection.name}
        </h3>
        <CollectionDescription description={collection.description} />
        <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
          {cta}
        </span>
      </div>
    </Link>
  );
}

function ShapeSkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <SkeletonBox height="h-40" className="!rounded-none" />
      <div className="p-5 space-y-3">
        <SkeletonBox width="w-32 h-5" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-3/4 h-4" />
        <SkeletonBox width="w-24 h-4 mt-4" />
      </div>
    </div>
  );
}

export default function CollectionShapeBlock({ content }: { content: CollectionShapeContent }) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('collectionPage');
  const section = getSectionText(content, {
    label: t('shapeLabel'),
    title: t('shapeTitle'),
    description: t('shapeDesc'),
  });
  const { data: shapeCollections, loading } = useBlockData<Collection>({
    prefetched: content.prefetchedCollections?.shape,
    fetch: async () => {
      const data = await collectionsApi.getAll(locale);
      return data.shape;
    },
    deps: [locale],
  });

  return (
    <section
      className="py-20 px-4 max-w-6xl mx-auto"
      aria-labelledby="shape-collection-heading"
    >
      <SectionHeading
        id="shape-collection-heading"
        label={section.label}
        title={section.title}
        description={section.description}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && shapeCollections.length > 0
          ? shapeCollections.map((shape) => (
              <ShapeCard
                key={shape.id}
                collection={shape}
                cta={t('cardCta')}
                shapeAria={(name) => t('shapeAria', { name })}
              />
            ))
          : Array.from({ length: 5 }).map((_, index) => <ShapeSkeletonCard key={index} />)}
      </div>
    </section>
  );
}
