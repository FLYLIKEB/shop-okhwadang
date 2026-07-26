'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import AdminPagination from '@/components/shared/admin/AdminPagination';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminCouponsApi, type AdminCoupon, type AdminCouponInput } from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { cn } from '@/components/ui/utils';

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

export default function AdminCouponsPage() {
  const t = useTranslations('admin.coupons');
  const commonT = useTranslations('admin.common');
  const locale = useLocale() as Locale;
  const { isAdmin } = useAdminGuard();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [filter, setFilter] = useState<CouponFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [issueCouponId, setIssueCouponId] = useState('');
  const [issueUserId, setIssueUserId] = useState('');

  const loadCoupons = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await adminCouponsApi.getList({
        page,
        limit: COUPON_PAGE_SIZE,
        q: searchKeyword.trim() || undefined,
        status: filter === 'all' ? undefined : filter,
      });
      setCoupons(result.items);
      setCurrentPage(result.page);
      setTotalCoupons(result.total);
    } catch (err) {
      toast.error(handleApiError(err, t('loadError')));
    } finally {
      setLoading(false);
    }
  }, [filter, searchKeyword, t]);

  useEffect(() => {
    if (isAdmin) void loadCoupons(1);
  }, [isAdmin, loadCoupons]);


  const { execute: saveCoupon, isLoading: savingCoupon } = useAsyncAction(
    async () => {
      const payload = toPayload(form);
      if (editingCouponId == null) {
        await adminCouponsApi.create(payload);
        await loadCoupons(1);
      } else {
        await adminCouponsApi.update(editingCouponId, payload);
        await loadCoupons(currentPage);
      }
      setEditingCouponId(null);
      setForm(EMPTY_FORM);
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
        setForm(EMPTY_FORM);
      }
      const fallbackPage = coupons.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
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
      setIssueUserId('');
    },
    { successMessage: t('issueSuccess'), errorMessage: t('issueError') },
  );

  const totalCouponPages = Math.max(1, Math.ceil(totalCoupons / COUPON_PAGE_SIZE));

  const beginEdit = (coupon: AdminCoupon) => {
    setEditingCouponId(coupon.id);
    setForm(toFormState(coupon));
  };

  const resetForm = () => {
    setEditingCouponId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveCoupon();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        meta={t('summary', { count: totalCoupons })}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <AdminFilterChips
                items={[
                  { label: t('filters.all'), value: 'all' },
                  { label: t('filters.active'), value: 'active' },
                  { label: t('filters.inactive'), value: 'inactive' },
                ]}
                value={filter}
                onToggle={(value) => setFilter(value as CouponFilter)}
                ariaLabel={t('filters.ariaLabel')}
                size="sm"
              />
              <AdminSearchForm
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchKeyword(searchInput);
                }}
                placeholder={t('searchPlaceholder')}
                submitLabel={t('search')}
                className="w-full lg:w-auto"
                inputClassName="w-full lg:w-72"
              />
            </div>
          </div>

          {loading ? (
            <AdminLoadingState title={t('loading')} />
          ) : coupons.length === 0 ? (
            <AdminEmptyState title={t('empty')} />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
                                amount: formatCurrency(coupon.minOrderAmount, locale),
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {coupon.type === 'percentage'
                              ? t('discount.percentage', { value: coupon.value })
                              : t('discount.fixed', { value: formatCurrency(coupon.value, locale) })}
                            {coupon.maxDiscount != null && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t('discount.max', { value: formatCurrency(coupon.maxDiscount, locale) })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>{coupon.issuedCount.toLocaleString(locale)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {coupon.totalQuantity == null
                                ? t('table.unlimited')
                                : t('table.totalQuantity', { count: coupon.totalQuantity })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div>{new Date(coupon.startsAt).toLocaleString(locale)}</div>
                            <div>{new Date(coupon.expiresAt).toLocaleString(locale)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                                coupon.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {coupon.isActive ? t('status.active') : t('status.inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(coupon)}
                                className="rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                {t('edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteCoupon(coupon.id)}
                                className="rounded-md border border-destructive/30 px-3 py-1.5 typo-button text-destructive hover:bg-destructive/10"
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
              <AdminPagination currentPage={currentPage} totalPages={totalCouponPages} onPageChange={(page) => void loadCoupons(page)} />
            </>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-4 shadow-sm">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.code')}
                  <input
                    value={form.code}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                    required
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.name')}
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.type')}
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, type: event.target.value as AdminCoupon['type'] }))
                    }
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <option value="percentage">{t('types.percentage')}</option>
                    <option value="fixed">{t('types.fixed')}</option>
                  </select>
                </label>
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.value')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.value}
                    onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                    required
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.minOrderAmount')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.minOrderAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.maxDiscount')}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxDiscount}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.totalQuantity')}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalQuantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalQuantity: event.target.value }))}
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.startsAt')}
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                    required
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 typo-body-sm font-medium">
                  {t('form.expiresAt')}
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                    required
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 typo-body-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
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

          <section className="rounded-lg border bg-card p-4 shadow-sm">
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
