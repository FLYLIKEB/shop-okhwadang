'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import { archivesApi } from '@/lib/api';
import type { ArchivesResponse, Artist, SectionHeadingBlockContent } from '@/lib/api';
import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import { getSectionText } from './archiveCollectionSection';

interface ArchiveArtistContent extends SectionHeadingBlockContent {
  prefetchedArchives?: ArchivesResponse;
}

interface ArtistStrings {
  artistRegionLabel: string;
  artistSpecialtyLabel: string;
  artistCta: string;
  artistAltSuffix: string;
}

function InlineHtmlText({
  html,
  className,
}: {
  html: string | null | undefined;
  className: string;
}) {
  const sanitized = sanitizeInlineHtml(html);

  if (!sanitized) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function ArtistCard({
  artist,
  reversed,
  strings,
}: {
  artist: Artist;
  reversed: boolean;
  strings: ArtistStrings;
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
          <InlineHtmlText
            html={artist.story}
            className="text-sm text-foreground leading-relaxed italic [&_b]:font-semibold [&_strong]:font-semibold"
          />
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

export default function ArchiveArtistBlock({ content }: { content: ArchiveArtistContent }) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('archivePage');
  const section = getSectionText(content, {
    label: t('artistLabel'),
    title: t('artistTitle'),
    description: t('artistDesc'),
  });
  const strings: ArtistStrings = {
    artistRegionLabel: t('artistRegionLabel'),
    artistSpecialtyLabel: t('artistSpecialtyLabel'),
    artistCta: t('artistCta'),
    artistAltSuffix: t('artistAltSuffix'),
  };
  const { data: artists, loading } = useBlockData<Artist>({
    prefetched: content.prefetchedArchives?.artists,
    fetch: async () => {
      const data = await archivesApi.getAll(locale);
      return data.artists;
    },
    deps: [locale],
  });

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="artist-heading">
      <SectionHeading
        id="artist-heading"
        label={section.label}
        title={section.title}
        description={section.description}
      />
      <div className="space-y-20">
        {!loading && artists.length > 0
          ? artists.map((artist, index) => (
              <ArtistCard key={artist.id} artist={artist} reversed={index % 2 === 1} strings={strings} />
            ))
          : Array.from({ length: 2 }).map((_, index) => (
              <ArtistSkeletonCard key={index} reversed={index % 2 === 1} />
            ))}
      </div>
    </section>
  );
}
