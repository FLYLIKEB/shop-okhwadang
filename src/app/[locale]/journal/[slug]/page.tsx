import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getJournalCategoryMessageKey } from '@/components/shared/journal/journalCategory';
import type { Journal } from '@/lib/api';
import { fetchJournal } from '@/lib/api-server';
import {
  JOURNAL_ENTRIES,
  type JournalEntry as LocalJournalEntry,
  getLocalizedJournalBySlug,
} from '@/lib/journal';

interface PageProps {
  params: Promise<{ locale: 'ko' | 'en'; slug: string }>;
}

interface RenderableJournal {
  title: string;
  subtitle: string | null;
  category: string;
  date: string;
  readTime: string | null;
  summary: string | null;
  content: string[];
}

export async function generateStaticParams() {
  return JOURNAL_ENTRIES.map((entry) => ({ slug: entry.slug }));
}

function parseJournalContent(content: string | null): string[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (paragraph): paragraph is string => typeof paragraph === 'string' && paragraph.length > 0,
      );
    }
  } catch {
    return [content];
  }

  return [content];
}

async function resolveJournal(
  slug: string,
  locale: 'ko' | 'en',
): Promise<RenderableJournal | null> {
  const localEntry = getLocalizedJournalBySlug(slug, locale);
  if (localEntry) {
    return normalizeLocalJournal(localEntry);
  }

  const apiJournal = await fetchJournal(slug, locale);
  if (apiJournal) {
    const tCategory = await getTranslations({ locale, namespace: 'journalCategories' });
    return normalizeApiJournal(apiJournal, tCategory);
  }

  return null;
}

function normalizeApiJournal(
  journal: Journal,
  tCategory: (key: string) => string,
): RenderableJournal {
  return {
    title: journal.title,
    subtitle: journal.subtitle,
    category: tCategory(getJournalCategoryMessageKey(journal.category)),
    date: journal.date,
    readTime: journal.readTime,
    summary: journal.summary,
    content: parseJournalContent(journal.content),
  };
}

function normalizeLocalJournal(entry: LocalJournalEntry): RenderableJournal {
  return {
    title: entry.title,
    subtitle: entry.subtitle,
    category: entry.category,
    date: entry.date,
    readTime: entry.readTime,
    summary: entry.summary,
    content: entry.content,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = await resolveJournal(slug, locale);
  if (!entry) return { title: locale === 'en' ? 'Journal — Ockhwadang' : 'Journal — 옥화당' };

  return {
    title: `${entry.title} — Journal`,
    description: entry.summary ?? undefined,
    openGraph: {
      title: entry.title,
      description: entry.summary ?? undefined,
      type: 'article',
      publishedTime: entry.date,
    },
  };
}

export default async function JournalDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'journalPage' });
  const entry = await resolveJournal(slug, locale);

  if (!entry) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.summary,
    datePublished: entry.date,
    publisher: {
      '@type': 'Organization',
      name: locale === 'en' ? 'Ockhwadang' : '옥화당',
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Hero */}
      <section className="border-b border-soft bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2 typo-label tracking-wide text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
              {entry.category}
            </span>
            <span aria-hidden="true">·</span>
            <time>{entry.date}</time>
            {entry.readTime ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {entry.readTime} {t('readSuffix')}
                </span>
              </>
            ) : null}
          </div>
          <h1 className="mb-3 font-display typo-h1 tracking-tight text-foreground">{entry.title}</h1>
          {entry.subtitle ? (
            <p className="font-display typo-h3 text-muted-foreground">{entry.subtitle}</p>
          ) : null}
        </div>
      </section>

      {/* 본문 */}
      <article className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        {entry.summary ? (
          <p className="mb-10 border-l-2 border-primary pl-4 typo-body leading-relaxed text-muted-foreground">
            {entry.summary}
          </p>
        ) : null}
        <div className="space-y-7">
          {entry.content.map((paragraph, i) => (
            <p key={i} className="typo-body leading-relaxed text-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* 하단 네비 */}
      <section className="border-t border-soft px-4 py-8">
        <div className="mx-auto max-w-3xl">
        <Link
          href="/journal"
          className="inline-flex min-h-11 items-center gap-2 typo-button text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('backToList')}
        </Link>
        </div>
      </section>
    </div>
  );
}
