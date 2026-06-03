'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/shared/common/SectionHeading';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { archivesApi } from '@/lib/api';
import type { ArchivesResponse, ProcessStep, SectionHeadingBlockContent } from '@/lib/api';
import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';
import { useBlockData } from '@/components/shared/hooks/useBlockData';
import { getSectionText } from './archiveCollectionSection';

interface ArchiveProcessContent extends SectionHeadingBlockContent {
  prefetchedArchives?: ArchivesResponse;
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

function ProcessCard({ step }: { step: ProcessStep }) {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
          {step.step}
        </span>
        <div className="flex-1 w-px bg-border mt-2" aria-hidden="true" />
      </div>
      <div className="pb-10">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">{step.description}</p>
        <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
        <InlineHtmlText
          html={step.detail}
          className="text-sm text-foreground leading-relaxed [&_b]:font-semibold [&_strong]:font-semibold"
        />
      </div>
    </article>
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

export default function ArchiveProcessBlock({ content }: { content: ArchiveProcessContent }) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('archivePage');
  const section = getSectionText(content, {
    label: t('processLabel'),
    title: t('processTitle'),
    description: t('processDesc'),
  });
  const { data: processSteps, loading } = useBlockData<ProcessStep>({
    prefetched: content.prefetchedArchives?.processSteps,
    fetch: async () => {
      const data = await archivesApi.getAll(locale);
      return data.processSteps;
    },
    deps: [locale],
  });

  return (
    <section className="py-20 px-4 max-w-3xl mx-auto" aria-labelledby="process-heading">
      <SectionHeading
        id="process-heading"
        label={section.label}
        title={section.title}
        description={section.description}
      />
      <div>
        {!loading && processSteps.length > 0
          ? processSteps.map((step) => <ProcessCard key={step.id} step={step} />)
          : Array.from({ length: 4 }).map((_, index) => <ProcessSkeletonCard key={index} />)}
      </div>
    </section>
  );
}
