import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/components/ui/utils';
import { fetchArchives } from '@/lib/api-server';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import type { NiloType, ProcessStep, Artist } from '@/lib/api';

interface ArchivePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ArchivePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'archivePage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

interface ArchiveStrings {
  niloColorAria: (name: string) => string;
  niloRegionLabel: string;
  niloCtaPrefix: string;
  artistRegionLabel: string;
  artistSpecialtyLabel: string;
  artistCta: string;
  artistAltSuffix: string;
}

function NiloCard({
  entry,
  reversed,
  strings,
}: {
  entry: NiloType;
  reversed: boolean;
  strings: ArchiveStrings;
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-8 md:gap-12 md:items-center',
        reversed ? 'md:flex-row-reverse' : 'md:flex-row',
      )}
    >
      <div
        className="w-full md:w-2/5 aspect-square rounded-lg shrink-0"
        style={{ backgroundColor: entry.color }}
        role="img"
        aria-label={strings.niloColorAria(entry.nameKo || entry.name)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{entry.name}</span>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{entry.nameKo}</h3>
        <p className="text-xs text-muted-foreground mb-4">{strings.niloRegionLabel}: {entry.region}</p>
        <p className="text-sm text-foreground leading-relaxed mb-6">{entry.description}</p>
        <ul className="grid grid-cols-2 gap-2 mb-6">
          {entry.characteristics.map((c) => (
            <li key={c} className="text-xs text-muted-foreground border border-border rounded px-3 py-1.5">
              {c}
            </li>
          ))}
        </ul>
        <Link
          href={entry.productUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-foreground rounded px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          {strings.niloCtaPrefix}
        </Link>
      </div>
    </article>
  );
}

function ProcessCard({ step: s }: { step: ProcessStep }) {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
          {s.step}
        </span>
        <div className="flex-1 w-px bg-border mt-2" aria-hidden="true" />
      </div>
      <div className="pb-10">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">{s.description}</p>
        <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
        <p className="text-sm text-foreground leading-relaxed">{s.detail}</p>
      </div>
    </article>
  );
}

function ArtistCard({
  artist,
  reversed,
  strings,
}: {
  artist: Artist;
  reversed: boolean;
  strings: ArchiveStrings;
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-8 md:gap-12 md:items-center',
        reversed ? 'md:flex-row-reverse' : 'md:flex-row',
      )}
    >
      <div className="relative w-full md:w-2/5 aspect-square rounded-lg bg-muted shrink-0 overflow-hidden">
        {artist.imageUrl ? (
          <Image
            src={artist.imageUrl}
            alt={`${artist.name} ${strings.artistAltSuffix}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-muted-foreground/30">
            {artist.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">{artist.title}</p>
        <h3 className="text-2xl font-bold text-foreground mb-1">{artist.name}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {strings.artistRegionLabel}: {artist.region} · {strings.artistSpecialtyLabel}: {artist.specialty}
        </p>
        <blockquote className="border-l-2 border-foreground pl-4 mb-6">
          <p className="text-sm text-foreground leading-relaxed italic">{artist.story}</p>
        </blockquote>
        <Link
          href={artist.productUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-foreground rounded px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          {strings.artistCta}
        </Link>
      </div>
    </article>
  );
}

function NiloSkeletonCard({ reversed }: { reversed: boolean }) {
  return (
    <div className={cn(
      'flex flex-col gap-8 md:gap-12 md:items-center',
      reversed ? 'md:flex-row-reverse' : 'md:flex-row',
    )}>
      <SkeletonBox className="w-full md:w-2/5 aspect-square !rounded-lg" />
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBox width="w-3 h-3 !rounded-full" />
          <SkeletonBox width="w-20 h-3" />
        </div>
        <SkeletonBox width="w-32 h-8" />
        <SkeletonBox width="w-40 h-4" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-full h-4" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonBox height="h-8" />
          <SkeletonBox height="h-8" />
        </div>
        <SkeletonBox width="w-40 h-10" className="mt-6" />
      </div>
    </div>
  );
}

function ProcessSkeletonCard() {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <SkeletonBox width="w-10 h-10 !rounded-full" />
        <SkeletonBox width="w-px flex-1 mt-2" className="min-h-20" />
      </div>
      <div className="pb-10 space-y-3">
        <SkeletonBox width="w-32 h-3" />
        <SkeletonBox width="w-40 h-6" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-full h-4" />
      </div>
    </article>
  );
}

function ArtistSkeletonCard({ reversed }: { reversed: boolean }) {
  return (
    <div className={cn(
      'flex flex-col gap-8 md:gap-12 md:items-center',
      reversed ? 'md:flex-row-reverse' : 'md:flex-row',
    )}>
      <SkeletonBox className="w-full md:w-2/5 aspect-square !rounded-lg" />
      <div className="flex-1 min-w-0 space-y-4">
        <SkeletonBox width="w-32 h-3" />
        <SkeletonBox width="w-40 h-8" />
        <SkeletonBox width="w-48 h-4" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-full h-4" />
        <SkeletonBox width="w-40 h-10" className="mt-6" />
      </div>
    </div>
  );
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'archivePage' });

  const strings: ArchiveStrings = {
    niloColorAria: (name: string) => t('niloColorAria', { name }),
    niloRegionLabel: t('niloRegionLabel'),
    niloCtaPrefix: t('niloCtaPrefix'),
    artistRegionLabel: t('artistRegionLabel'),
    artistSpecialtyLabel: t('artistSpecialtyLabel'),
    artistCta: t('artistCta'),
    artistAltSuffix: t('artistAltSuffix'),
  };

  let niloTypes: NiloType[] = [];
  let processSteps: ProcessStep[] = [];
  let artists: Artist[] = [];

  let fetchError: Error | null = null;

  try {
    const data = await fetchArchives(locale);
    niloTypes = data.niloTypes;
    processSteps = data.processSteps;
    artists = data.artists;
  } catch (err) {
    fetchError = err instanceof Error ? err : new Error('아카이브 데이터를 불러오지 못했습니다.');
    niloTypes = [];
    processSteps = [];
    artists = [];
  }

  if (fetchError) {
    throw fetchError;
  }

  return (
    <div className="min-h-screen">
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">{t('heroEyebrow')}</p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t('heroTitle')}</h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          {t('heroDesc')}
        </p>
      </section>

      <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="nilo-heading">
        <SectionHeading
          label={t('niloLabel')}
          title={t('niloTitle')}
          description={t('niloDesc')}
        />
        <div className="space-y-20" id="nilo-heading">
          {niloTypes.length > 0 ? (
            niloTypes.map((entry, i) => (
              <NiloCard key={entry.id} entry={entry} reversed={i % 2 === 1} strings={strings} />
            ))
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <NiloSkeletonCard key={i} reversed={i % 2 === 1} />
            ))
          )}
        </div>
      </section>

      <hr className="border-border" />

      <section className="py-20 px-4 max-w-3xl mx-auto" aria-labelledby="process-heading">
        <SectionHeading
          label={t('processLabel')}
          title={t('processTitle')}
          description={t('processDesc')}
        />
        <div id="process-heading">
          {processSteps.length > 0 ? (
            processSteps.map((s) => (
              <ProcessCard key={s.id} step={s} />
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <ProcessSkeletonCard key={i} />
            ))
          )}
        </div>
      </section>

      <hr className="border-border" />

      <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="artist-heading">
        <SectionHeading
          label={t('artistLabel')}
          title={t('artistTitle')}
          description={t('artistDesc')}
        />
        <div className="space-y-20" id="artist-heading">
          {artists.length > 0 ? (
            artists.map((artist, i) => (
              <ArtistCard key={artist.id} artist={artist} reversed={i % 2 === 1} strings={strings} />
            ))
          ) : (
            Array.from({ length: 2 }).map((_, i) => (
              <ArtistSkeletonCard key={i} reversed={i % 2 === 1} />
            ))
          )}
        </div>
      </section>

      <section className="bg-muted py-16 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t('shopEyebrow')}</p>
        <h2 className="text-2xl font-bold text-foreground mb-4">{t('shopTitle')}</h2>
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
