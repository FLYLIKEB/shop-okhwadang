'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { localMessage } from '@/utils/localMessages';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    { errorMessage: localMessage('auth.registerError') },
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (name.length < 1 || name.length > 100) next.name = localMessage('auth.validation.nameTooShort');
    if (!EMAIL_REGEX.test(email)) next.email = localMessage('auth.validation.emailInvalid');
    if (password.length < 8) next.password = localMessage('auth.validation.passwordTooShort');
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) next.password = localMessage('auth.validation.passwordRequirements');
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) next.password = localMessage('auth.validation.passwordNeedsSpecial');
    if (password !== passwordConfirm) next.passwordConfirm = localMessage('auth.validation.passwordMismatch');
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
      <h1 className="text-2xl font-bold text-center mb-8">{localMessage('auth.registerTitle')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">{localMessage('auth.name')}</label>
          <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm', 'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.name ? 'border-destructive' : 'border-input')} placeholder={localMessage('auth.namePlaceholder')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">{localMessage('auth.email')}</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm', 'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.email ? 'border-destructive' : 'border-input')} placeholder={localMessage('auth.emailPlaceholder')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">{localMessage('auth.password')}</label>
          <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm', 'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.password ? 'border-destructive' : 'border-input')} placeholder={localMessage('auth.passwordHint')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="passwordConfirm" className="text-sm font-medium">{localMessage('auth.passwordConfirm')}</label>
          <input id="passwordConfirm" type="password" autoComplete="new-password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm', 'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.passwordConfirm ? 'border-destructive' : 'border-input')} placeholder={localMessage('auth.passwordConfirmPlaceholder')} />
          {errors.passwordConfirm && <p className="text-xs text-destructive">{errors.passwordConfirm}</p>}
        </div>

        <Button type="submit" variant="black" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? localMessage('auth.registerSubmitting') : localMessage('auth.registerSubmit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {localMessage('auth.hasAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">{localMessage('auth.loginSubmit')}</Link>
      </p>
    </div>
  );
}
