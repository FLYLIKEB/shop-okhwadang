import type { Metadata } from 'next';
import Image from 'next/image';
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
  content: JournalContentBlock[];
}

type JournalContentBlock =
  { type: 'text'; text: string } | { type: 'image'; src: string; alt: string };

type RawJournalContentBlock = {
  type?: unknown;
  src?: unknown;
  url?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  alt?: unknown;
  altText?: unknown;
  caption?: unknown;
};

export async function generateStaticParams() {
  return JOURNAL_ENTRIES.map((entry) => ({ slug: entry.slug }));
}

const RAW_TEXT_BLOCK_PATTERN =
  /<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi;
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const HTML_ATTRIBUTE_PATTERN = /([a-zA-Z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeHtmlText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(RAW_TEXT_BLOCK_PATTERN, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(HTML_TAG_PATTERN, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function getHtmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(HTML_ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase();
    const rawValue = match[2] ?? '';
    if (!name) continue;
    attrs[name] = decodeHtmlEntities(rawValue.replace(/^['"]|['"]$/g, ''));
  }
  return attrs;
}

function isSafeJournalImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function appendTextBlock(blocks: JournalContentBlock[], value: string) {
  const text = normalizeHtmlText(value);
  if (!text) return;

  const previous = blocks[blocks.length - 1];
  if (previous?.type === 'text') {
    previous.text = `${previous.text} ${text}`;
    return;
  }

  blocks.push({ type: 'text', text });
}

function appendImageBlock(blocks: JournalContentBlock[], src: unknown, alt: unknown) {
  if (typeof src !== 'string' || !isSafeJournalImageUrl(src)) return;
  blocks.push({
    type: 'image',
    src: src.trim(),
    alt: typeof alt === 'string' ? normalizeHtmlText(alt) : '',
  });
}

function parseJournalContentString(value: string): JournalContentBlock[] {
  const blocks: JournalContentBlock[] = [];
  let cursor = 0;
  for (const match of value.matchAll(IMG_TAG_PATTERN)) {
    const index = match.index ?? 0;
    appendTextBlock(blocks, value.slice(cursor, index));
    const attrs = getHtmlAttributes(match[0]);
    appendImageBlock(blocks, attrs.src, attrs.alt ?? attrs.title);
    cursor = index + match[0].length;
  }
  appendTextBlock(blocks, value.slice(cursor));
  return blocks;
}

function parseJournalContentBlock(block: unknown): JournalContentBlock[] {
  if (typeof block === 'string') return parseJournalContentString(block);
  if (!block || typeof block !== 'object') return [];

  const candidate = block as RawJournalContentBlock;
  const src = candidate.src ?? candidate.url ?? candidate.imageUrl ?? candidate.image_url;
  const alt = candidate.alt ?? candidate.altText ?? candidate.caption;
  const blocks: JournalContentBlock[] = [];
  appendImageBlock(blocks, src, alt);
  return blocks;
}

function parseJournalContent(content: string | null): JournalContentBlock[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.flatMap(parseJournalContentBlock);
    }
  } catch {
    return parseJournalContentString(content);
  }

  return parseJournalContentString(content);
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
    content: entry.content.flatMap(parseJournalContentString),
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
          <h1 className="mb-3 font-display typo-h1 tracking-tight text-foreground">
            {entry.title}
          </h1>
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
          {entry.content.map((block, i) =>
            block.type === 'image' ? (
              <figure
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-soft bg-muted/30"
              >
                <Image
                  src={block.src}
                  alt={block.alt || entry.title}
                  fill
                  sizes="(min-width: 768px) 768px, calc(100vw - 2rem)"
                  className="object-contain"
                />
              </figure>
            ) : (
              <p key={i} className="whitespace-pre-line typo-body leading-relaxed text-foreground">
                {block.text}
              </p>
            ),
          )}
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
