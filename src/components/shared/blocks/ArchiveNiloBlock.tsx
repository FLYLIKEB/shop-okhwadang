'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import { archivesApi } from '@/lib/api';
import type { ArchivesResponse, NiloType, SectionHeadingBlockContent } from '@/lib/api';
import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import { getSectionText } from './archiveCollectionSection';

interface ArchiveNiloContent extends SectionHeadingBlockContent {
  prefetchedArchives?: ArchivesResponse;
}

interface ArchiveStrings {
  niloColorAria: (name: string) => string;
  niloRegionLabel: string;
  niloCtaPrefix: string;
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
        <InlineHtmlText
          html={entry.description}
          className="text-sm text-foreground leading-relaxed mb-6 [&_b]:font-semibold [&_strong]:font-semibold"
        />
        <ul className="grid grid-cols-2 gap-2 mb-6">
          {entry.characteristics.map((characteristic) => (
            <li key={characteristic} className="text-xs text-muted-foreground border border-border rounded px-3 py-1.5">
              {characteristic}
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

export default function ArchiveNiloBlock({ content }: { content: ArchiveNiloContent }) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('archivePage');
  const section = getSectionText(content, {
    label: t('niloLabel'),
    title: t('niloTitle'),
    description: t('niloDesc'),
  });
  const strings: ArchiveStrings = {
    niloColorAria: (name: string) => t('niloColorAria', { name }),
    niloRegionLabel: t('niloRegionLabel'),
    niloCtaPrefix: t('niloCtaPrefix'),
  };
  const { data: niloTypes, loading } = useBlockData<NiloType>({
    prefetched: content.prefetchedArchives?.niloTypes,
    fetch: async () => {
      const data = await archivesApi.getAll(locale);
      return data.niloTypes;
    },
    deps: [locale],
  });

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="nilo-heading">
      <SectionHeading
        id="nilo-heading"
        label={section.label}
        title={section.title}
        description={section.description}
      />
      <div className="space-y-20">
        {!loading && niloTypes.length > 0
          ? niloTypes.map((entry, index) => (
              <NiloCard key={entry.id} entry={entry} reversed={index % 2 === 1} strings={strings} />
            ))
          : Array.from({ length: 6 }).map((_, index) => (
              <NiloSkeletonCard key={index} reversed={index % 2 === 1} />
            ))}
      </div>
    </section>
  );
}
