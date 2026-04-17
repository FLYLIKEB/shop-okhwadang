import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { fetchCollections } from '@/lib/api-server';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import type { Collection } from '@/lib/api';

interface CollectionPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collectionPage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
    },
  };
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          {collection.description}
        </p>
        <span className="inline-block mt-4 text-xs font-medium text-foreground border-b border-foreground pb-0.5 group-hover:border-foreground/60 transition-colors">
          {cta}
        </span>
      </div>
    </Link>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          {collection.description}
        </p>
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

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collectionPage' });

  const cta = t('cardCta');
  const colorAria = (name: string) => t('colorAria', { name });
  const shapeAria = (name: string) => t('shapeAria', { name });

  let clayCollections: Collection[] = [];
  let shapeCollections: Collection[] = [];

  let fetchError: Error | null = null;

  try {
    const data = await fetchCollections(locale);
    clayCollections = data.clay;
    shapeCollections = data.shape;
  } catch (err) {
    fetchError = err instanceof Error ? err : new Error('컬렉션 데이터를 불러오지 못했습니다.');
    clayCollections = [];
    shapeCollections = [];
  }

  if (fetchError) {
    throw fetchError;
  }

  return (
    <div className="min-h-screen">
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">
          {t('heroEyebrow')}
        </p>
        <h1 className="font-display typo-h1 tracking-tight mb-4">
          {t('heroTitle')}
        </h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          {t('heroDesc')}
        </p>
      </section>

      <section
        className="py-20 px-4 max-w-6xl mx-auto"
        aria-labelledby="clay-collection-heading"
      >
        <SectionHeading
          id="clay-collection-heading"
          label={t('clayLabel')}
          title={t('clayTitle')}
          description={t('clayDesc')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clayCollections.length > 0 ? (
            clayCollections.map((clay) => (
              <ClayCard key={clay.id} collection={clay} cta={cta} colorAria={colorAria} />
            ))
          ) : (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <ClaySkeletonCard key={i} />
              ))}
            </>
          )}
        </div>
      </section>

      <hr className="border-border" />

      <section
        className="py-20 px-4 max-w-6xl mx-auto"
        aria-labelledby="shape-collection-heading"
      >
        <SectionHeading
          id="shape-collection-heading"
          label={t('shapeLabel')}
          title={t('shapeTitle')}
          description={t('shapeDesc')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shapeCollections.length > 0 ? (
            shapeCollections.map((shape) => (
              <ShapeCard key={shape.id} collection={shape} cta={cta} shapeAria={shapeAria} />
            ))
          ) : (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <ShapeSkeletonCard key={i} />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="bg-muted py-16 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          {t('shopEyebrow')}
        </p>
        <h2 className="font-display typo-h2 text-foreground mb-4">
          {t('shopTitle')}
        </h2>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium bg-foreground text-background rounded px-6 py-3 hover:opacity-80 transition-opacity"
        >
          {t('shopCta')}
        </Link>
      </section>
    </div>
  );
}
