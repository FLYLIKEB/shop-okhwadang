import { getTranslations } from 'next-intl/server';
import JournalListClient from '@/components/shared/journal/JournalListClient';

interface JournalPageProps {
  params: Promise<{ locale: string }>;
}

export default async function JournalPage({ params }: JournalPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'journalPage' });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-soft bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 typo-label tracking-widest text-muted-foreground">
            {t('heroEyebrow')}
          </p>
          <h1 className="mb-4 font-display typo-h1 tracking-tight text-foreground">
            {t('heroTitle')}
          </h1>
          <p className="max-w-xl typo-body text-muted-foreground">
            {t('heroDesc')}
          </p>
        </div>
      </section>

      {/* 필터 + 목록 */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <JournalListClient />
      </section>
    </div>
  );
}
