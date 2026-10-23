import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoginForm from '@/components/shared/auth/LoginForm';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string | string[] }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('loginTitle'),
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const redirect = Array.isArray(query.redirect) ? query.redirect[0] : query.redirect;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <LoginForm redirect={redirect} />
    </div>
  );
}
