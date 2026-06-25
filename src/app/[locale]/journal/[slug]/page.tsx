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
  const apiJournal = await fetchJournal(slug, locale);
  if (apiJournal) {
    const tCategory = await getTranslations({ locale, namespace: 'journalCategories' });
    return normalizeApiJournal(apiJournal, tCategory);
  }

  const fallbackEntry = getLocalizedJournalBySlug(slug, locale);
  return fallbackEntry ? normalizeLocalJournal(fallbackEntry) : null;
}

function normalizeApiJournal(journal: Journal, tCategory: (key: string) => string): RenderableJournal {
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
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 justify-center mb-4">
            <span className="text-xs font-semibold tracking-widest uppercase text-background/60">
              {entry.category}
            </span>
            <span className="text-xs text-background/40">·</span>
            <time className="text-xs text-background/60">{entry.date}</time>
            {entry.readTime ? (
              <>
                <span className="text-xs text-background/40">·</span>
                <span className="text-xs text-background/60">{entry.readTime} {t('readSuffix')}</span>
              </>
            ) : null}
          </div>
          <h1 className="font-display typo-h1 tracking-tight mb-3">
            {entry.title}
          </h1>
          {entry.subtitle ? (
            <p className="typo-h3 text-background/70 font-display">
              {entry.subtitle}
            </p>
          ) : null}
        </div>
      </section>

      {/* 본문 */}
      <article className="py-16 px-4 max-w-3xl mx-auto">
        {entry.summary ? (
          <p className="text-base text-muted-foreground leading-relaxed mb-8 border-l-2 border-foreground pl-4 italic">
            {entry.summary}
          </p>
        ) : null}
        <div className="space-y-6">
          {entry.content.map((paragraph, i) => (
            <p key={i} className="text-base text-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* 하단 네비 */}
      <section className="border-t border-border py-12 px-4 max-w-3xl mx-auto">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
        >
          {t('backToList')}
        </Link>
      </section>
    </div>
  );
}
