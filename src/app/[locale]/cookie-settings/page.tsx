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
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface/70">
        <div className="layout-container py-16 md:py-24">
          <p className="typo-label text-muted-foreground">{t('eyebrow')}</p>
          <h1 className="typo-h1 mt-3 max-w-3xl text-foreground">{t('title')}</h1>
          <p className="typo-body mt-4 max-w-3xl text-muted-foreground">{t('description')}</p>
        </div>
      </section>

      <div className="layout-container layout-section max-w-3xl space-y-8">
        <section className="rounded-lg border border-border p-6">
          <h2 className="typo-h3">{t('essential.title')}</h2>
          <p className="typo-body mt-3 text-muted-foreground">{t('essential.body')}</p>
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
            {t('essential.status')}
          </p>
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="typo-h3">{t('analytics.title')}</h2>
          <p className="typo-body mt-3 text-muted-foreground">{t('analytics.body')}</p>
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {t('analytics.browserGuide')}
          </p>
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="typo-h3">{t('browser.title')}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
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
