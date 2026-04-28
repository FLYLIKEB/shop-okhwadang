'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { handleApiError } from '@/utils/error';
import { usersApi } from '@/lib/api';
import type { UserAddress, CreateAddressData } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
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

function validateForm(form: AddressForm, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  if (!form.recipientName.trim()) errors.recipientName = t('validation.recipientNameRequired');
  if (!/^01[0-9]-\d{3,4}-\d{4}$/.test(form.phone)) {
    errors.phone = t('validation.phoneInvalid');
  }
  if (!/^\d{5}$/.test(form.zipcode)) errors.zipcode = t('validation.zipcodeInvalid');
  if (!form.address.trim()) errors.address = t('validation.addressRequired');
  return errors;
}

export default function AddressPage() {
  const t = useTranslations('address');
  const tMy = useTranslations('myPage');
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const { execute: fetchAddresses, isLoading: loading } = useAsyncAction(
    async () => {
      setError(null);
      const data = await usersApi.getAddresses();
      setAddresses(data);
    },
    {
      errorMessage: t('loadError'),
      onError: (err) => setError(handleApiError(err, t('loadError'))),
    },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const errors = validateForm(form, t);
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
        toast.success(t('updateSuccess'));
      } else {
        const created = await usersApi.createAddress(data);
        setAddresses((prev) => {
          const list = data.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : [...prev];
          return [...list, created];
        });
        toast.success(t('addSuccess'));
      }
      handleCancel();
    } catch (err) {
      toast.error(handleApiError(err, t('saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await usersApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success(t('deleteSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('deleteError')));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const updated = await usersApi.updateAddress(id, { isDefault: true });
      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })),
      );
      toast.success(t('setDefaultSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('saveError')));
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
          {tMy('title')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="typo-h2">{t('title')}</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <SkeletonBox key={i} height="h-24" />
          ))}
        </div>
      ) : error !== null ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-12 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => void fetchAddresses()}
            className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
          >
            {tMy('retry')}
          </button>
        </div>
      ) : (
        <>
          {addresses.length === 0 && !showForm && (
            <div className="mb-4 rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">{t('noSavedAddresses')}</p>
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
                            {t('defaultBadge')}
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
                          {t('setDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(addr)}
                        className="rounded border px-2 py-1 text-xs hover:bg-muted transition-colors"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        {t('delete')}
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
              {t('addAddress')}
            </button>
          )}

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border p-6 space-y-4 bg-muted/20"
            >
              <h2 className="text-base font-semibold">
                {editingId !== null ? t('editAddress') : t('newAddress')}
              </h2>

              {[
                { id: 'recipientName', label: t('recipientName'), placeholder: t('recipientName'), required: true },
                { id: 'phone', label: t('phone'), placeholder: '010-1234-5678', required: true },
                { id: 'zipcode', label: t('zipcode'), placeholder: '12345', required: true },
                { id: 'address', label: t('address'), placeholder: t('address'), required: true },
                { id: 'addressDetail', label: t('addressDetail'), placeholder: t('addressDetail'), required: false },
                { id: 'label', label: t('label'), placeholder: t('labelPlaceholder'), required: false },
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
                {t('setAsDefault')}
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {submitting ? t('saving') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
