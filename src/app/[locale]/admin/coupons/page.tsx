'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminCouponsApi, type AdminCoupon, type AdminCouponInput } from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';
import { cn } from '@/components/ui/utils';
import { formatCount, formatDateTime } from '@/utils/date';

type CouponFilter = 'all' | 'active' | 'inactive';

type CouponFormState = {
  code: string;
  name: string;
  type: AdminCoupon['type'];
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  totalQuantity: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_FORM: CouponFormState = {
  code: '',
  name: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '0',
  maxDiscount: '',
  totalQuantity: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const COUPON_PAGE_SIZE = 20;

function toDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

function toFormState(coupon: AdminCoupon): CouponFormState {
  return {
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    value: String(coupon.value),
    minOrderAmount: String(coupon.minOrderAmount ?? 0),
    maxDiscount: coupon.maxDiscount == null ? '' : String(coupon.maxDiscount),
    totalQuantity: coupon.totalQuantity == null ? '' : String(coupon.totalQuantity),
    startsAt: toDateTimeInput(coupon.startsAt),
    expiresAt: toDateTimeInput(coupon.expiresAt),
    isActive: coupon.isActive,
  };
}

function toPayload(form: CouponFormState): AdminCouponInput {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    value: Number(form.value),
    minOrderAmount: Number(form.minOrderAmount || 0),
    maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
    totalQuantity: form.totalQuantity === '' ? null : Number(form.totalQuantity),
    startsAt: fromDateTimeInput(form.startsAt),
    expiresAt: fromDateTimeInput(form.expiresAt),
    isActive: form.isActive,
  };
}

function changed<T>(next: T, current: T): boolean {
  return next !== current;
}

function toUpdatePayload(form: CouponFormState, coupon: AdminCoupon): Partial<AdminCouponInput> {
  const payload: Partial<AdminCouponInput> = {};
  const nextCode = form.code.trim();
  const nextName = form.name.trim();
  const nextTotalQuantity = form.totalQuantity === '' ? null : Number(form.totalQuantity);

  if (changed(nextCode, coupon.code)) payload.code = nextCode;
  if (changed(nextName, coupon.name)) payload.name = nextName;
  if (changed(nextTotalQuantity, coupon.totalQuantity)) payload.totalQuantity = nextTotalQuantity;

  if (coupon.issuedCount > 0) return payload;

  const originalForm = toFormState(coupon);
  const nextMinOrderAmount = Number(form.minOrderAmount || 0);
  const nextMaxDiscount = form.maxDiscount === '' ? null : Number(form.maxDiscount);

  if (changed(form.type, coupon.type)) payload.type = form.type;
  if (changed(Number(form.value), coupon.value)) payload.value = Number(form.value);
  if (changed(nextMinOrderAmount, coupon.minOrderAmount)) payload.minOrderAmount = nextMinOrderAmount;
  if (changed(nextMaxDiscount, coupon.maxDiscount)) payload.maxDiscount = nextMaxDiscount;
  if (form.startsAt !== originalForm.startsAt) payload.startsAt = fromDateTimeInput(form.startsAt);
  if (form.expiresAt !== originalForm.expiresAt) payload.expiresAt = fromDateTimeInput(form.expiresAt);
  if (changed(form.isActive, coupon.isActive)) payload.isActive = form.isActive;

  return payload;
}

function isFiniteNumber(value: string): boolean {
  if (value.trim() === '') return false;
  return Number.isFinite(Number(value));
}

function dateMsForValidation(value: string, originalIso?: string): number {
  if (originalIso && value === toDateTimeInput(originalIso)) return Date.parse(originalIso);
  if (!value) return Number.NaN;
  return Date.parse(fromDateTimeInput(value));
}

export default function AdminCouponsPage() {
  const t = useTranslations('admin.coupons');
  const commonT = useTranslations('admin.common');
  const locale = useLocale() as Locale;
  const { isAdmin } = useAdminGuard();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const {
    page,
    setPage,
    keyword,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    submitSearch,
  } = useAdminListPage({
    initialFilters: {
      status: 'all' as CouponFilter,
    },
  });
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [issueCouponId, setIssueCouponId] = useState('');
  const [issueUserId, setIssueUserId] = useState('');

  const { execute: loadCoupons, isLoading: loading } = useAsyncAction(
    async (pageOverride?: number) => {
      const requestedPage = pageOverride ?? page;
      setLoadError(null);
      const result = await adminCouponsApi.getList({
        page: requestedPage,
        limit: COUPON_PAGE_SIZE,
        q: keyword.trim() || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
      });
      setCoupons(result.items);
      setTotalCoupons(result.total);
    },
    {
      errorMessage: t('loadError'),
      onError: () => setLoadError(t('loadError')),
    },
  );

  useEffect(() => {
    if (isAdmin) void loadCoupons(undefined);
  }, [isAdmin, loadCoupons, page, filters.status, keyword]);

  const { execute: saveCoupon, isLoading: savingCoupon } = useAsyncAction(
    async () => {
      if (editingCoupon == null) {
        const payload = toPayload(form);
        await adminCouponsApi.create(payload);
        setPage(1);
        await loadCoupons(1);
      } else {
        const payload = toUpdatePayload(form, editingCoupon);
        await adminCouponsApi.update(editingCoupon.id, payload);
        await loadCoupons(page);
      }
      setEditingCouponId(null);
      setEditingCoupon(null);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    {
      successMessage: editingCouponId == null ? t('createSuccess') : t('updateSuccess'),
      errorMessage: editingCouponId == null ? t('createError') : t('updateError'),
    },
  );

  const { execute: deleteCoupon } = useAsyncAction(
    async (couponId: number) => {
      await adminCouponsApi.remove(couponId);
      if (editingCouponId === couponId) {
        setEditingCouponId(null);
        setEditingCoupon(null);
        setForm(EMPTY_FORM);
      }
      const fallbackPage = coupons.length === 1 && page > 1 ? page - 1 : page;
      setPage(fallbackPage);
      await loadCoupons(fallbackPage);
    },
    { successMessage: t('deleteSuccess'), errorMessage: t('deleteError') },
  );


  const { execute: issueCoupon, isLoading: issuingCoupon } = useAsyncAction(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await adminCouponsApi.issue({
        couponId: Number(issueCouponId),
        userId: Number(issueUserId),
      });
      setEditingCoupon((current) => current?.id === Number(issueCouponId)
        ? { ...current, issuedCount: current.issuedCount + 1 }
        : current);
      setIssueUserId('');
      await loadCoupons(undefined);
    },
    { successMessage: t('issueSuccess'), errorMessage: t('issueError') },
  );

  const totalCouponPages = Math.max(1, Math.ceil(totalCoupons / COUPON_PAGE_SIZE));

  const beginEdit = (coupon: AdminCoupon) => {
    setEditingCouponId(coupon.id);
    setEditingCoupon(coupon);
    setForm(toFormState(coupon));
    setFormError(null);
  };

  const resetForm = () => {
    setEditingCouponId(null);
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!form.code.trim()) return t('validation.codeRequired');
    if (!form.name.trim()) return t('validation.nameRequired');

    if (!isFiniteNumber(form.value) || Number(form.value) <= 0) return t('validation.valuePositive');
    if (form.type === 'percentage' && Number(form.value) > 100) return t('validation.percentMax');
    if (!isFiniteNumber(form.minOrderAmount) || Number(form.minOrderAmount) < 0) {
      return t('validation.minOrderAmount');
    }
    if (form.maxDiscount !== '' && (!isFiniteNumber(form.maxDiscount) || Number(form.maxDiscount) < 0)) {
      return t('validation.maxDiscount');
    }
    if (
      form.totalQuantity !== ''
      && (!Number.isInteger(Number(form.totalQuantity)) || Number(form.totalQuantity) <= 0)
    ) {
      return t('validation.totalQuantity');
    }
    if (
      editingCoupon != null
      && form.totalQuantity !== ''
      && Number(form.totalQuantity) < editingCoupon.issuedCount
    ) {
      return t('validation.totalQuantityIssued', { count: editingCoupon.issuedCount });
    }

    const startsAt = dateMsForValidation(form.startsAt, editingCoupon?.startsAt);
    const expiresAt = dateMsForValidation(form.expiresAt, editingCoupon?.expiresAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt)) return t('validation.datesRequired');
    if (expiresAt <= startsAt) return t('validation.dateRange');

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm();
    setFormError(error);
    if (error) {
      toast.error(error);
      return;
    }
    void saveCoupon();
  };

  const issuedLocked = editingCoupon != null && editingCoupon.issuedCount > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        meta={t('summary', { count: totalCoupons })}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
        <div className="space-y-4">
          <div className="surface-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <AdminFilterChips
                items={[
                  { label: t('filters.all'), value: 'all' },
                  { label: t('filters.active'), value: 'active' },
                  { label: t('filters.inactive'), value: 'inactive' },
                ]}
                value={filters.status}
                onToggle={(value) => setFilter('status', value as CouponFilter)}
                ariaLabel={t('filters.ariaLabel')}
                size="sm"
              />
              <AdminSearchForm
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={submitSearch}
                placeholder={t('searchPlaceholder')}
                submitLabel={t('search')}
                className="w-full lg:w-auto"
                inputClassName="w-full lg:w-72"
              />
            </div>
          </div>

          <PaginatedAdminTableShell
            loading={loading}
            loadingMessage={t('loading')}
            isEmpty={coupons.length === 0}
            emptyMessage={t('empty')}
            errorMessage={loadError}
            errorAction={
              <button
                type="button"
                onClick={() => void loadCoupons(undefined)}
                className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground hover:bg-primary/90"
              >
                {commonT('retry')}
              </button>
            }
            currentPage={page}
            totalPages={totalCouponPages}
            onPageChange={setPage}
          >
            <div className="surface-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t('table.code')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.name')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.discount')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.quantity')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.period')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.status')}</th>
                        <th className="px-4 py-3 font-medium text-right">{t('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="border-t align-top">
                          <td className="px-4 py-3 font-medium">{coupon.code}</td>
                          <td className="px-4 py-3">
                            <div>{coupon.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {t('table.minOrderAmount', {
                                amount: formatCurrency(coupon.minOrderAmount, 'ko'),
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {coupon.type === 'percentage'
                              ? t('discount.percentage', { value: coupon.value })
                              : t('discount.fixed', { value: formatCurrency(coupon.value, 'ko') })}
                            {coupon.maxDiscount != null && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t('discount.max', { value: formatCurrency(coupon.maxDiscount, 'ko') })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>{formatCount(coupon.issuedCount, locale)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {coupon.totalQuantity == null
                                ? t('table.unlimited')
                                : t('table.totalQuantity', { count: coupon.totalQuantity })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div>{formatDateTime(coupon.startsAt, locale)}</div>
                            <div>{formatDateTime(coupon.expiresAt, locale)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium',
                                coupon.isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {coupon.isActive ? t('status.active') : t('status.inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => beginEdit(coupon)}
                                className="whitespace-nowrap rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                {t('edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteCoupon(coupon.id)}
                                className="whitespace-nowrap rounded-md border border-destructive/30 px-3 py-1.5 typo-button text-destructive hover:bg-destructive/10"
                              >
                                {t('delete')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </PaginatedAdminTableShell>
        </div>

        <div className="space-y-4">
          <section className="surface-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="typo-body font-semibold">
                  {editingCouponId == null ? t('createTitle') : t('editTitle')}
                </h2>
                <p className="mt-1 typo-body-sm text-muted-foreground">{t('formDescription')}</p>
              </div>
              {editingCouponId != null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {commonT('resetFilters')}
                </button>
              )}
            </div>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              {formError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}
              {issuedLocked && (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {t('form.issuedLockedReason')}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.code')}
                  <input
                    value={form.code}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                    required
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.name')}
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.type')}
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, type: event.target.value as AdminCoupon['type'] }))
                    }
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  >
                    <option value="percentage">{t('types.percentage')}</option>
                    <option value="fixed">{t('types.fixed')}</option>
                  </select>
                </label>
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t(form.type === 'percentage' ? 'form.valuePercentage' : 'form.valueFixed')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.value}
                    onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                    required
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3">
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.minOrderAmount')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.minOrderAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.maxDiscount')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxDiscount}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.totalQuantity')}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalQuantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalQuantity: event.target.value }))}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.startsAt')}
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                    required
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid min-w-0 gap-1 typo-body-sm font-medium">
                  {t('form.expiresAt')}
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                    required
                    disabled={issuedLocked}
                    className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 typo-body-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  disabled={issuedLocked}
                />
                {t('form.isActive')}
              </label>
              <div className="flex justify-end gap-2">
                {editingCouponId != null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-md border px-4 py-2 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {t('cancelEdit')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {savingCoupon ? t('saving') : editingCouponId == null ? t('create') : t('update')}
                </button>
              </div>
            </form>
          </section>

          <section className="surface-card p-4">
            <h2 className="typo-body font-semibold">{t('issueTitle')}</h2>
            <p className="mt-1 typo-body-sm text-muted-foreground">{t('issueDescription')}</p>
            <form className="mt-4 grid gap-3" onSubmit={(event) => void issueCoupon(event)}>
              <label className="grid gap-1 typo-body-sm font-medium">
                {t('issueForm.coupon')}
                <select
                  value={issueCouponId}
                  onChange={(event) => setIssueCouponId(event.target.value)}
                  required
                  className="rounded-md border bg-background px-3 py-2"
                >
                  <option value="">{t('issueForm.couponPlaceholder')}</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} · {coupon.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 typo-body-sm font-medium">
                {t('issueForm.userId')}
                <input
                  type="number"
                  min="1"
                  value={issueUserId}
                  onChange={(event) => setIssueUserId(event.target.value)}
                  placeholder={t('issueForm.userIdPlaceholder')}
                  required
                  className="rounded-md border bg-background px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={issuingCoupon || issueCouponId === '' || issueUserId === ''}
                className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {issuingCoupon ? t('issuing') : t('issue')}
              </button>
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}
