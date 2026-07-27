'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AdminPagination from '@/components/shared/admin/AdminPagination';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import {
  adminCouponRulesApi,
  adminCouponsApi,
  type AdminCoupon,
  type AdminCouponRule,
  type AdminCouponRuleInput,
  type CouponRuleTrigger,
} from '@/lib/api';
import { handleApiError } from '@/utils/error';

const TRIGGERS: CouponRuleTrigger[] = ['signup', 'first_purchase', 'birthday', 'tier_up'];
const RULE_PAGE_SIZE = 20;
const COUPON_OPTION_PAGE_SIZE = 20;

type RuleFormState = {
  trigger: CouponRuleTrigger;
  couponTemplateId: string;
  conditionsJson: string;
  active: boolean;
};

const EMPTY_FORM: RuleFormState = {
  trigger: 'signup',
  couponTemplateId: '',
  conditionsJson: '',
  active: true,
};

function toFormState(rule: AdminCouponRule): RuleFormState {
  return {
    trigger: rule.trigger,
    couponTemplateId: String(rule.couponTemplateId),
    conditionsJson: rule.conditionsJson ? JSON.stringify(rule.conditionsJson, null, 2) : '',
    active: rule.active,
  };
}

function parseConditionsJson(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function formatCouponLabel(coupon: Pick<AdminCoupon, 'id' | 'code' | 'name'>): string {
  return `${coupon.code} · ${coupon.name} (#${coupon.id})`;
}

export default function AdminCouponRulesPage() {
  const t = useTranslations('admin.couponRules');
  const { isAdmin } = useAdminGuard();
  const [rules, setRules] = useState<AdminCouponRule[]>([]);
  const [rulePage, setRulePage] = useState(1);
  const [ruleTotal, setRuleTotal] = useState(0);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponOptions, setCouponOptions] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);

  const loadData = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const ruleResponse = await adminCouponRulesApi.getList({ page: nextPage, limit: RULE_PAGE_SIZE });
      setRules(ruleResponse.items);
      setRulePage(ruleResponse.page);
      setRuleTotal(ruleResponse.total);
    } catch (err) {
      toast.error(handleApiError(err, t('loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadCouponOptions = useCallback(async (keyword: string) => {
    try {
      const response = await adminCouponsApi.getList({
        page: 1,
        limit: COUPON_OPTION_PAGE_SIZE,
        q: keyword.trim() || undefined,
      });
      setCouponOptions(response.items);
    } catch (err) {
      setCouponOptions([]);
      toast.error(handleApiError(err, t('couponLabelLoadError')));
    }
  }, [t]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadData(1);
  }, [isAdmin, loadData]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadCouponOptions(couponSearch);
  }, [couponSearch, isAdmin, loadCouponOptions]);

  const { execute: saveRule, isLoading: savingRule } = useAsyncAction(
    async () => {
      const payload: AdminCouponRuleInput = {
        trigger: form.trigger,
        couponTemplateId: Number(form.couponTemplateId),
        conditionsJson: parseConditionsJson(form.conditionsJson),
        active: form.active,
      };
      if (editingRuleId == null) {
        await adminCouponRulesApi.create(payload);
        await loadData(1);
      } else {
        await adminCouponRulesApi.update(editingRuleId, payload);
        await loadData(rulePage);
      }
      setEditingRuleId(null);
      setCouponSearch('');
      setForm(EMPTY_FORM);
    },
    {
      successMessage: editingRuleId == null ? t('createSuccess') : t('updateSuccess'),
      errorMessage: editingRuleId == null ? t('createError') : t('updateError'),
    },
  );

  const { execute: removeRule } = useAsyncAction(
    async (ruleId: number) => {
      await adminCouponRulesApi.remove(ruleId);
      if (editingRuleId === ruleId) {
        setEditingRuleId(null);
        setCouponSearch('');
        setForm(EMPTY_FORM);
      }
      const fallbackPage = rules.length === 1 && rulePage > 1 ? rulePage - 1 : rulePage;
      await loadData(fallbackPage);
    },
    { successMessage: t('deleteSuccess'), errorMessage: t('deleteError') },
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveRule();
  };

  const beginEdit = (rule: AdminCouponRule) => {
    setEditingRuleId(rule.id);
    setForm(toFormState(rule));
    setCouponSearch(rule.couponTemplate ? `${rule.couponTemplate.code} ${rule.couponTemplate.name}` : '');
  };

  const totalRulePages = Math.max(1, Math.ceil(ruleTotal / RULE_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        meta={t('summary', { count: ruleTotal })}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <div>
          {loading ? (
            <AdminLoadingState title={t('loading')} />
          ) : rules.length === 0 ? (
            <AdminEmptyState title={t('empty')} />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t('table.trigger')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.coupon')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.conditions')}</th>
                        <th className="px-4 py-3 font-medium">{t('table.status')}</th>
                        <th className="px-4 py-3 font-medium text-right">{t('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr key={rule.id} className="border-t align-top">
                          <td className="px-4 py-3 font-medium">{t(`triggers.${rule.trigger}`)}</td>
                          <td className="px-4 py-3">
                            {rule.couponTemplate ? formatCouponLabel(rule.couponTemplate) : t('table.couponFallback', { id: rule.couponTemplateId })}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <pre className="whitespace-pre-wrap font-mono">
                              {rule.conditionsJson == null ? t('table.noConditions') : JSON.stringify(rule.conditionsJson, null, 2)}
                            </pre>
                          </td>
                          <td className="px-4 py-3">
                            <span className={rule.active ? 'text-emerald-700' : 'text-muted-foreground'}>
                              {rule.active ? t('status.active') : t('status.inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(rule)}
                                className="rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                {t('edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeRule(rule.id)}
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
              <AdminPagination currentPage={rulePage} totalPages={totalRulePages} onPageChange={(page) => void loadData(page)} />
            </>
          )}
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="typo-body font-semibold">
              {editingRuleId == null ? t('createTitle') : t('editTitle')}
            </h2>
            <p className="mt-1 typo-body-sm text-muted-foreground">{t('formDescription')}</p>
          </div>
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('form.trigger')}
              <select
                value={form.trigger}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, trigger: event.target.value as CouponRuleTrigger }))
                }
                className="rounded-md border bg-background px-3 py-2"
              >
                {TRIGGERS.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {t(`triggers.${trigger}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('form.couponTemplate')}
              <input
                type="number"
                min="1"
                value={form.couponTemplateId}
                onChange={(event) => setForm((prev) => ({ ...prev, couponTemplateId: event.target.value }))}
                placeholder={t('form.couponTemplatePlaceholder')}
                required
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('form.couponTemplateSearch')}
              <input
                value={couponSearch}
                onChange={(event) => setCouponSearch(event.target.value)}
                placeholder={t('form.couponTemplateSearchPlaceholder')}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            {couponOptions.length > 0 ? (
              <div className="rounded-md border">
                <ul className="max-h-48 overflow-y-auto">
                  {couponOptions.map((coupon) => (
                    <li key={coupon.id} className="border-t first:border-t-0">
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, couponTemplateId: String(coupon.id) }));
                          setCouponSearch(`${coupon.code} ${coupon.name}`);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
                      >
                        <span>{formatCouponLabel(coupon)}</span>
                        <span className="text-xs text-muted-foreground">#{coupon.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('form.conditionsJson')}
              <textarea
                value={form.conditionsJson}
                onChange={(event) => setForm((prev) => ({ ...prev, conditionsJson: event.target.value }))}
                placeholder={t('form.conditionsPlaceholder')}
                rows={8}
                className="rounded-md border bg-background px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="flex items-center gap-2 typo-body-sm font-medium">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              {t('form.active')}
            </label>
            <div className="flex justify-end gap-2">
              {editingRuleId != null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRuleId(null);
                    setCouponSearch('');
                    setForm(EMPTY_FORM);
                  }}
                  className="rounded-md border px-4 py-2 typo-button text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {t('cancelEdit')}
                </button>
              )}
              <button
                type="submit"
                disabled={savingRule}
                className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {savingRule ? t('saving') : editingRuleId == null ? t('create') : t('update')}
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}
