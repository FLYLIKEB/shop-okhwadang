'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import { useAsyncAction } from '@/hooks/useAsyncAction';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!EMAIL_REGEX.test(email)) return '올바른 이메일 형식이 아닙니다.';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return '비밀번호는 영문과 숫자를 모두 포함해야 합니다.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return '비밀번호는 특수문자를 포함해야 합니다.';
  return null;
}

function validateName(name: string): string | null {
  if (name.length < 1 || name.length > 100) return '이름은 1~100자 사이여야 합니다.';
  return null;
}

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { execute: submitRegister, isLoading: isSubmitting } = useAsyncAction(
    async () => {
      await register(email, password, name);
      router.push('/login');
    },
    { errorMessage: '회원가입에 실패했습니다.' },
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const nameErr = validateName(name);
    if (nameErr) next.name = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) next.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    if (password !== passwordConfirm) next.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    void submitRegister();
  };

  return (
    <div className="mx-auto max-w-sm w-full">
      <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.name ? 'border-destructive' : 'border-input',
            )}
            placeholder="홍길동"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.email ? 'border-destructive' : 'border-input',
            )}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.password ? 'border-destructive' : 'border-input',
            )}
            placeholder="영문+숫자+특수문자 8자 이상"
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="passwordConfirm" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              errors.passwordConfirm ? 'border-destructive' : 'border-input',
            )}
            placeholder="비밀번호 재입력"
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">{errors.passwordConfirm}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '가입 중...' : '회원가입'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
