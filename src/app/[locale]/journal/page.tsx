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
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="typo-label tracking-widest uppercase text-background/60 mb-3">
          {t('heroEyebrow')}
        </p>
        <h1 className="font-display typo-h1 tracking-tight mb-4">
          {t('heroTitle')}
        </h1>
        <p className="max-w-xl mx-auto typo-body text-background/80">
          {t('heroDesc')}
        </p>
      </section>

      {/* 필터 + 목록 */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <JournalListClient />
      </section>
    </div>
  );
}
