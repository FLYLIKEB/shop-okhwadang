import { getTranslations } from 'next-intl/server';
import JournalListClient from '@/components/shared/journal/JournalListClient';

interface JournalPageProps {
  params: Promise<{ locale: string }>;
}

export default async function JournalPage({ params }: JournalPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'journalPage' });

  return (
    <div className="editorial-content-page min-h-screen layout-container">
      <header className="editorial-page-header">
        <p className="mb-2 typo-label text-muted-foreground">
          {t('heroEyebrow')}
        </p>
        <h1 className="mb-2 typo-h1 font-normal text-foreground">
          {t('heroTitle')}
        </h1>
        <p className="max-w-xl typo-body text-muted-foreground">
          {t('heroDesc')}
        </p>
      </header>

      {/* 필터 + 목록 */}
      <section className="editorial-page-body pb-12">
        <JournalListClient />
      </section>
    </div>
  );
}
