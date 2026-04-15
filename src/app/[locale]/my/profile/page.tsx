'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

interface ProfileForm {
  name: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
}

function validateForm(form: ProfileForm): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 1) {
    errors.name = '이름을 입력해주세요.';
  }
  if (form.phone && !/^01[0-9]-\d{3,4}-\d{4}$/.test(form.phone)) {
    errors.phone = '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)';
  }
  return errors;
}

export default function ProfilePage() {
  const { isLoading } = useRequireAuth();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>({ name: '', phone: '' });
  const [errors, setErrors] = useState<FormErrors>({});

  const { execute: submitProfile, isLoading: submitting } = useAsyncAction(
    async () => {
      const updated = await usersApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      updateUser({ name: updated.name, phone: updated.phone });
    },
    { successMessage: '회원정보가 수정되었습니다.', errorMessage: '수정 중 오류가 발생했습니다.' },
  );

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, phone: user.phone ?? '' });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    void submitProfile();
  };

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          마이페이지
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="typo-h2">회원정보 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-5">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            readOnly
            className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            이름 <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="홍길동"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className="text-sm font-medium">
            전화번호
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            value={form.phone}
            onChange={handleChange}
            placeholder="010-1234-5678"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </div>
  );
}
