import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface LayoutProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'journalPage' });
  const title = `Journal — ${t('heroTitle')}`;
  const description = t('heroDesc');
  return {
    title,
    description,
    openGraph: {
      title: `Journal — 옥화당`,
      description,
    },
  };
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
