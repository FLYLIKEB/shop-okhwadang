import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: Props): Promise<{ title: string }> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cookieSettings' });
  return { title: t('metaTitle') };
}

export default async function CookieSettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cookieSettings' });

  return (
    <main className="editorial-content-page layout-container layout-page">
      <header className="editorial-page-header">
        <p className="typo-label text-muted-foreground">{t('eyebrow')}</p>
        <h1 className="typo-h1 mt-3 max-w-3xl text-foreground">{t('title')}</h1>
        <p className="typo-body mt-4 max-w-3xl text-muted-foreground">{t('description')}</p>
      </header>

      <div className="editorial-page-body">
        <section className="editorial-section">
          <h2 className="typo-h3">{t('essential.title')}</h2>
          <p className="typo-body mt-3 text-muted-foreground">{t('essential.body')}</p>
          <p className="mt-3 font-medium text-foreground">
            {t('essential.status')}
          </p>
        </section>

        <section className="editorial-section">
          <h2 className="typo-h3">{t('analytics.title')}</h2>
          <p className="typo-body mt-3 text-muted-foreground">{t('analytics.body')}</p>
          <p className="mt-3 text-muted-foreground">
            {t('analytics.browserGuide')}
          </p>
        </section>

        <section className="editorial-section">
          <h2 className="typo-h3">{t('browser.title')}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t('browser.chrome')}</li>
            <li>{t('browser.safari')}</li>
            <li>{t('browser.edge')}</li>
            <li>{t('browser.firefox')}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
