import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: '회원가입',
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <RegisterForm />
    </div>
  );
}
