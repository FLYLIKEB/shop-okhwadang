import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JOURNAL_ENTRIES, getJournalBySlug } from '@/lib/journal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return JOURNAL_ENTRIES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getJournalBySlug(slug);
  if (!entry) return { title: 'Journal — 옥화당' };

  return {
    title: `${entry.title} — Journal`,
    description: entry.summary,
    openGraph: {
      title: entry.title,
      description: entry.summary,
      type: 'article',
      publishedTime: entry.date,
    },
  };
}

export default async function JournalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getJournalBySlug(slug);

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
      name: '옥화당',
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
            <span className="text-xs text-background/40">·</span>
            <span className="text-xs text-background/60">{entry.readTime} 읽기</span>
          </div>
          <h1 className="font-display typo-h1 tracking-tight mb-3">
            {entry.title}
          </h1>
          <p className="typo-h3 text-background/70 font-display">
            {entry.subtitle}
          </p>
        </div>
      </section>

      {/* 본문 */}
      <article className="py-16 px-4 max-w-3xl mx-auto">
        <p className="text-base text-muted-foreground leading-relaxed mb-8 border-l-2 border-foreground pl-4 italic">
          {entry.summary}
        </p>
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
          ← 저널 목록으로 돌아가기
        </Link>
      </section>
    </div>
  );
}
