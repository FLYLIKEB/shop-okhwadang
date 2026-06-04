import type { Metadata } from 'next';
import RegisterForm from '@/components/shared/auth/RegisterForm';

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: locale === 'en' ? 'Sign up' : '회원가입',
  };
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <RegisterForm />
    </div>
  );
}
