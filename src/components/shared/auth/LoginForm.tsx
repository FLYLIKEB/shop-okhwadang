'use client';

import { useState, type FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { handleApiError } from '@/utils/error';
import { isSafeUrl } from '@/utils/url';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import FormField, { getFormControlClassName } from '@/components/ui/FormField';
import FormInput from '@/components/ui/FormInput';
import { cn } from '@/components/ui/utils';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { localMessage } from '@/utils/localMessages';

interface LoginFormProps {
  redirect?: string;
}

export default function LoginForm({ redirect }: LoginFormProps) {
  const router = useRouter();
  const redirectTo = redirect && isSafeUrl(redirect) ? redirect : '/';
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
        const message = handleApiError(err, localMessage('auth.loginError'));
        if (message.includes('이메일') || message.toLowerCase().includes('email')) {
          setEmailError(message);
        } else if (message.includes('비밀번호') || message.toLowerCase().includes('password')) {
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
      <h1 className="text-2xl font-bold text-center mb-8">{localMessage('auth.loginTitle')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError('');
          }}
          label={localMessage('auth.email')}
          error={emailError}
          placeholder={localMessage('auth.emailPlaceholder')}
        />

        <FormField id="password" label={localMessage('auth.password')} required error={passwordError}>
          {({ controlProps }) => (
            <div className="relative">
              <input
                {...controlProps}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={getFormControlClassName({ error: passwordError, className: 'pr-10' })}
                placeholder={localMessage('auth.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                aria-label={showPassword ? localMessage('auth.hidePassword') : localMessage('auth.showPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </FormField>

        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground cursor-not-allowed">{localMessage('auth.forgotPassword')}</span>
        </div>

        <Button type="submit" variant="black" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? localMessage('auth.loginSubmitting') : localMessage('auth.loginSubmit')}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">{localMessage('auth.dividerOr')}</span>
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
          {localMessage('auth.kakaoLogin')}
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
          {localMessage('auth.googleLogin')}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {localMessage('auth.noAccount')}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {localMessage('auth.registerSubmit')}
        </Link>
      </p>
    </div>
  );
}
