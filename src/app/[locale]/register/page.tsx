import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RegisterForm from '@/components/shared/auth/RegisterForm';

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('registerTitle'),
  };
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <RegisterForm />
    </div>
  );
}
