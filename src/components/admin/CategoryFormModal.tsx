'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/components/ui/utils';
import FormInput from '@/components/ui/FormInput';
import type { AdminCategory, CreateCategoryData } from '@/lib/api';
import { useFormModal } from '@/hooks/useFormModal';

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryData) => Promise<void>;
  categories: AdminCategory[];
  initial?: AdminCategory | null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const CATEGORY_DEFAULTS: CreateCategoryData = {
  name: '',
  slug: '',
  parentId: null,
  sortOrder: 0,
  isActive: true,
  imageUrl: null,
};

function toFormData(initial: AdminCategory): CreateCategoryData {
  return {
    name: initial.name,
    slug: initial.slug,
    parentId: initial.parentId,
    sortOrder: initial.sortOrder,
    isActive: initial.isActive,
    imageUrl: initial.imageUrl ?? null,
  };
}

export default function CategoryFormModal({
  open,
  onClose,
  onSubmit,
  categories,
  initial,
}: CategoryFormModalProps) {
  const initialFormData = useMemo(
    () => (initial ? toFormData(initial) : null),
    [initial],
  );
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateCategoryData>(
    CATEGORY_DEFAULTS,
    initialFormData,
    open,
  );

  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSlugTouched(!!initial);
      setErrors({});
    }
  }, [open, initial]);

  const handleNameChange = (value: string) => {
    setForm({ ...form, name: value });
    if (!slugTouched) {
      setForm((prev) => ({ ...prev, name: value, slug: slugify(value) }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = '카테고리명을 입력하세요.';
    if (!form.slug.trim()) newErrors.slug = 'slug를 입력하세요.';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) newErrors.slug = 'slug는 영문 소문자, 숫자, 하이픈만 허용됩니다.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (data: CreateCategoryData) => {
    await onSubmit({
      name: data.name.trim(),
      slug: data.slug.trim(),
      parentId: data.parentId,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      imageUrl: data.imageUrl ? (data.imageUrl as string).trim() || null : null,
    });
  };

  const isEdit = !!initial;

  const rootCategories = categories.filter(
    (c) => c.parentId === null && (!initial || c.id !== initial.id),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 id="category-modal-title" className="mb-4 text-lg font-semibold">
          {isEdit ? '카테고리 수정' : '카테고리 추가'}
        </h2>

        <form
          onSubmit={(e) => {
            if (!validate()) { e.preventDefault(); return; }
            handleSubmit(e, handleFormSubmit, onClose);
          }}
          className="space-y-4"
        >
          <FormInput
            id="category-name"
            label="카테고리명"
            required
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="패션"
            error={errors.name}
          />

          <FormInput
            id="category-slug"
            label="slug"
            required
            value={form.slug}
            onChange={(e) => {
              setForm({ ...form, slug: e.target.value });
              setSlugTouched(true);
            }}
            placeholder="fashion"
            error={errors.slug}
          />

          <div className="space-y-1">
            <label htmlFor="category-parent" className="text-sm font-medium">
              상위 카테고리
            </label>
            <select
              id="category-parent"
              value={form.parentId ?? ''}
              onChange={(e) => setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
                'focus:ring-2 focus:ring-foreground/20',
              )}
            >
              <option value="">없음 (최상위)</option>
              {rootCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <FormInput
            id="category-sort-order"
            label="정렬 순서"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />

          <FormInput
            id="category-image-url"
            label="이미지 URL"
            value={form.imageUrl ?? ''}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />

          <div className="flex items-center gap-2">
            <input
              id="category-is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="size-4"
            />
            <label htmlFor="category-is-active" className="text-sm">
              활성화
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                'rounded-md border px-4 py-2 text-sm',
                'hover:bg-muted disabled:opacity-50',
              )}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-md bg-foreground px-4 py-2 text-sm text-background',
                'hover:opacity-90 disabled:opacity-50',
              )}
            >
              {loading ? '저장 중...' : isEdit ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
