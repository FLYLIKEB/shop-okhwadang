'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { usersApi } from '@/lib/api';
import type { UserAddress, CreateAddressData } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';

interface AddressForm {
  recipientName: string;
  phone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  label: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressForm = {
  recipientName: '',
  phone: '',
  zipcode: '',
  address: '',
  addressDetail: '',
  label: '',
  isDefault: false,
};

interface FormErrors {
  recipientName?: string;
  phone?: string;
  zipcode?: string;
  address?: string;
}

function validateForm(form: AddressForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.recipientName.trim()) errors.recipientName = '받는 분 이름을 입력해주세요.';
  if (!/^01[0-9]-\d{3,4}-\d{4}$/.test(form.phone)) {
    errors.phone = '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)';
  }
  if (!/^\d{5}$/.test(form.zipcode)) errors.zipcode = '우편번호는 5자리 숫자로 입력해주세요.';
  if (!form.address.trim()) errors.address = '주소를 입력해주세요.';
  return errors;
}

export default function AddressPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    usersApi
      .getAddresses()
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (addr: UserAddress) => {
    setEditingId(addr.id);
    setForm({
      recipientName: addr.recipientName,
      phone: addr.phone,
      zipcode: addr.zipcode,
      address: addr.address,
      addressDetail: addr.addressDetail ?? '',
      label: addr.label ?? '',
      isDefault: addr.isDefault,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const data: CreateAddressData = {
      recipientName: form.recipientName.trim(),
      phone: form.phone.trim(),
      zipcode: form.zipcode.trim(),
      address: form.address.trim(),
      addressDetail: form.addressDetail.trim() || null,
      label: form.label.trim() || null,
      isDefault: form.isDefault,
    };

    setSubmitting(true);
    try {
      if (editingId !== null) {
        const updated = await usersApi.updateAddress(editingId, data);
        setAddresses((prev) => {
          const list = prev.map((a) =>
            a.id === editingId ? updated : data.isDefault ? { ...a, isDefault: false } : a,
          );
          return list;
        });
        toast.success('배송지가 수정되었습니다.');
      } else {
        const created = await usersApi.createAddress(data);
        setAddresses((prev) => {
          const list = data.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : [...prev];
          return [...list, created];
        });
        toast.success('배송지가 추가되었습니다.');
      }
      handleCancel();
    } catch (err) {
      toast.error(handleApiError(err, '오류가 발생했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('배송지를 삭제하시겠습니까?')) return;
    try {
      await usersApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('배송지가 삭제되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '삭제 중 오류가 발생했습니다.'));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const updated = await usersApi.updateAddress(id, { isDefault: true });
      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })),
      );
      toast.success('기본 배송지로 설정되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '오류가 발생했습니다.'));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          마이페이지
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">배송지 관리</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <SkeletonBox key={i} height="h-24" />
          ))}
        </div>
      ) : (
        <>
          {addresses.length === 0 && !showForm && (
            <div className="mb-4 rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">저장된 배송지가 없습니다.</p>
            </div>
          )}

          {addresses.length > 0 && (
            <ul className="mb-4 space-y-3">
              {addresses.map((addr) => (
                <li key={addr.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 text-sm space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{addr.recipientName}</span>
                        {addr.label && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {addr.label}
                          </span>
                        )}
                        {addr.isDefault && (
                          <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                            기본
                          </span>
                        )}
                      </div>
                      <p>{addr.phone}</p>
                      <p className="text-muted-foreground">
                        [{addr.zipcode}] {addr.address}
                        {addr.addressDetail && `, ${addr.addressDetail}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="rounded border px-2 py-1 text-xs hover:bg-muted transition-colors"
                        >
                          기본 설정
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(addr)}
                        className="rounded border px-2 py-1 text-xs hover:bg-muted transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!showForm && addresses.length < 10 && (
            <button
              onClick={openCreate}
              className="w-full rounded-lg border-2 border-dashed py-3 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
            >
              + 배송지 추가
            </button>
          )}

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border p-6 space-y-4 bg-muted/20"
            >
              <h2 className="text-base font-semibold">
                {editingId !== null ? '배송지 수정' : '새 배송지'}
              </h2>

              {[
                { id: 'recipientName', label: '받는 분', placeholder: '홍길동', required: true },
                { id: 'phone', label: '전화번호', placeholder: '010-1234-5678', required: true },
                { id: 'zipcode', label: '우편번호', placeholder: '12345', required: true },
                { id: 'address', label: '주소', placeholder: '서울특별시 강남구 테헤란로 123', required: true },
                { id: 'addressDetail', label: '상세 주소', placeholder: '동/호수 등', required: false },
                { id: 'label', label: '라벨', placeholder: '집, 회사 등', required: false },
              ].map(({ id, label, placeholder, required }) => (
                <div key={id} className="space-y-1">
                  <label htmlFor={id} className="text-sm font-medium">
                    {label} {required && <span className="text-destructive">*</span>}
                  </label>
                  <input
                    id={id}
                    name={id}
                    type="text"
                    value={form[id as keyof AddressForm] as string}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                  {formErrors[id as keyof FormErrors] && (
                    <p className="text-xs text-destructive">{formErrors[id as keyof FormErrors]}</p>
                  )}
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="accent-foreground"
                />
                기본 배송지로 설정
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
