import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: '로그인',
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <LoginForm />
    </div>
  );
}
