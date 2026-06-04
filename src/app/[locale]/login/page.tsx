import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from '@/components/shared/auth/LoginForm';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'en' ? 'Login' : '로그인',
  };
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
