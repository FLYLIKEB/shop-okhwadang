'use client';

import { useState, type FormEvent, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '@/utils/error';
import { isSafeUrl } from '@/utils/url';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTo = rawRedirect && isSafeUrl(rawRedirect) ? rawRedirect : '/';
  const { login, loginWithKakao, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = useCallback(() => {
    setShowPassword(true);
    setTimeout(() => setShowPassword(false), 1000);
  }, []);

  const { execute: submitLogin, isLoading: isSubmitting } = useAsyncAction(
    async () => {
      await login(email, password);
      router.push(redirectTo);
    },
    {
      onError: (err) => {
        const message = handleApiError(err, '로그인에 실패했습니다.');
        if (message.includes('이메일') || message.includes('email')) {
          setEmailError(message);
        } else if (message.includes('비밀번호') || message.includes('password')) {
          setPasswordError(message);
        } else {
          setEmailError(message);
        }
      },
    },
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    void submitLogin();
  };

  return (
    <div className="mx-auto max-w-sm w-full">
      <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              emailError && 'border-destructive',
            )}
            placeholder="you@example.com"
          />
          {emailError && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <span className="text-xs text-muted-foreground cursor-not-allowed">비밀번호 찾기</span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm',
                'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                passwordError && 'border-destructive',
              )}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={handleTogglePassword}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 잠깐 보기'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">또는</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={loginWithKakao}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
            'bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90 transition-colors',
          )}
        >
          <span className="font-bold">K</span>
          카카오로 로그인
        </button>

        <button
          type="button"
          onClick={loginWithGoogle}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium',
            'bg-background hover:bg-accent transition-colors',
          )}
        >
          <span className="font-bold text-blue-500">G</span>
          Google로 로그인
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
