'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import {
  adminMembersApi,
  adminPointsApi,
  type AdminMember,
  type AdminPointHistoryItem,
  type AdminPointSourceKind,
  type AdminPointsUserSummary,
} from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { cn } from '@/components/ui/utils';

const SOURCE_KIND_TONES: Record<AdminPointSourceKind, string> = {
  review_reward_earn: 'bg-sky-100 text-sky-700',
  review_reward_revoke: 'bg-sky-100 text-sky-700',
  order_use: 'bg-violet-100 text-violet-700',
  expiry: 'bg-slate-200 text-slate-700',
  order_restore: 'bg-emerald-100 text-emerald-700',
  manual_grant: 'bg-amber-100 text-amber-800',
  manual_debit: 'bg-amber-100 text-amber-800',
};

const HISTORY_PAGE_SIZE = 50;
const MEMBER_SEARCH_PAGE_SIZE = 20;

function parseUserId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function AdminPointsPage() {
  const t = useTranslations('admin.points');
  const commonT = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useAdminGuard();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOptions, setMemberOptions] = useState<AdminMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [summary, setSummary] = useState<AdminPointsUserSummary | null>(null);
  const [history, setHistory] = useState<AdminPointHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingMemberData, setLoadingMemberData] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const userId = parseUserId(searchParams.get('userId'));

  const loadMembers = useCallback(async (keyword: string) => {
    try {
      const trimmedKeyword = keyword.trim();
      const firstPage = await adminMembersApi.getList({
        q: trimmedKeyword || undefined,
        page: 1,
        limit: MEMBER_SEARCH_PAGE_SIZE,
      });

      let nextOptions = firstPage.items;
      let exact = nextOptions.find((item) => item.id === userId);
      if (!exact && trimmedKeyword === '' && userId != null) {
        if (selectedMember?.id === userId) {
          exact = selectedMember;
        } else {
          try {
            exact = await adminMembersApi.getById(userId);
          } catch {
            exact = null;
          }
        }

        if (exact && !nextOptions.some((item) => item.id === exact.id)) {
          nextOptions = [...nextOptions, exact];
        }
      }

      if (selectedMember == null && exact) {
        setSelectedMember(exact);
      }
      setMemberOptions(nextOptions);
    } catch (err) {
      toast.error(handleApiError(err, t('memberLookupError')));
    }
  }, [selectedMember, t, userId]);

  const loadPointData = useCallback(async (nextUserId: number, nextPage = 1) => {
    setLoadingMemberData(true);
    try {
      const [nextSummary, nextHistory] = await Promise.all([
        adminPointsApi.getUserSummary(nextUserId),
        adminPointsApi.getUserHistory(nextUserId, { page: nextPage, limit: HISTORY_PAGE_SIZE }),
      ]);
      setSummary(nextSummary);
      setHistory(nextHistory.items);
      setHistoryTotal(nextHistory.total);
      setHistoryPage(nextHistory.page);
    } catch (err) {
      toast.error(handleApiError(err, t('loadError')));
      setSummary(null);
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setLoadingMemberData(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadMembers(memberSearch);
  }, [isAdmin, loadMembers, memberSearch]);

useEffect(() => {
  if (!isAdmin || userId == null) {
    setSummary(null);
    setHistory([]);
    setHistoryTotal(0);
    setHistoryPage(1);
    return;
  }
  void loadPointData(userId, 1);
}, [isAdmin, loadPointData, userId]);

  useEffect(() => {
    if (userId == null) {
      setSelectedMember(null);
      return;
    }
    if (selectedMember && selectedMember.id !== userId) {
      setSelectedMember(null);
    }
  }, [selectedMember, userId]);

  const { execute: submitAdjustment, isLoading: savingAdjustment } = useAsyncAction(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (userId == null) return;
      await adminPointsApi.createAdjustment({
        userId,
        delta: Number(amount),
        reason: reason.trim(),
      });
      setAmount('');
      setReason('');
      await loadPointData(userId);
    },
    { successMessage: t('adjustmentSuccess'), errorMessage: t('adjustmentError') },
  );

  const selectedMemberLabel = useMemo(() => {
    if (selectedMember) return `${selectedMember.name} · ${selectedMember.email}`;
    if (userId != null) return t('selectedUserFallback', { userId });
    return t('noUserSelected');
  }, [selectedMember, t, userId]);

  const goToUser = (nextUserId: number, member?: AdminMember) => {
    if (member) setSelectedMember(member);
    const params = new URLSearchParams(searchParams.toString());
    params.set('userId', String(nextUserId));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

const totalHistoryPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));

const goToHistoryPage = (nextPage: number) => {
  if (userId == null) return;
  const boundedPage = Math.min(Math.max(nextPage, 1), totalHistoryPages);
  if (boundedPage === historyPage) return;
  void loadPointData(userId, boundedPage);
};

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <AdminPageHeader title={t('title')} description={t('description')} />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-3">
            <div>
              <h2 className="typo-body font-semibold">{t('memberSelectorTitle')}</h2>
              <p className="mt-1 typo-body-sm text-muted-foreground">{t('memberSelectorDescription')}</p>
            </div>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('memberSearchLabel')}
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder={t('memberSearchPlaceholder')}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {memberOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">{t('memberSearchEmpty')}</div>
              ) : (
                <ul>
                  {memberOptions.map((member) => (
                    <li key={member.id} className="border-t first:border-t-0">
                      <button
                        type="button"
                        onClick={() => goToUser(member.id, member)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40',
                          userId === member.id && 'bg-muted',
                        )}
                      >
                        <span>
                          <span className="font-medium">{member.name}</span>
                          <span className="ml-2 text-muted-foreground">{member.email}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">#{member.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="typo-label text-muted-foreground">{t('selectedUser')}</div>
            <div className="mt-1 typo-body font-medium">{selectedMemberLabel}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-background p-4 shadow-sm">
                <div className="typo-label text-muted-foreground">{t('balanceLabel')}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {summary ? formatCurrency(summary.balance, locale) : '—'}
                </div>
              </div>
              <div className="rounded-md bg-background p-4 shadow-sm">
                <div className="typo-label text-muted-foreground">{t('historyCountLabel')}</div>
                <div className="mt-2 text-2xl font-semibold">{historyTotal.toLocaleString(locale)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
        <div>
          {userId == null ? (
            <AdminEmptyState title={t('selectMemberPrompt')} />
          ) : loadingMemberData ? (
            <AdminLoadingState title={t('loading')} />
          ) : history.length === 0 ? (
            <AdminEmptyState title={t('empty')} />
          ) : (
<div className="overflow-hidden rounded-lg border bg-card shadow-sm">
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="bg-muted/40 text-left">
        <tr>
          <th className="px-4 py-3 font-medium">{t('table.createdAt')}</th>
          <th className="px-4 py-3 font-medium">{t('table.type')}</th>
          <th className="px-4 py-3 font-medium">{t('table.sourceKind')}</th>
          <th className="px-4 py-3 font-medium">{t('table.amount')}</th>
          <th className="px-4 py-3 font-medium">{t('table.balance')}</th>
          <th className="px-4 py-3 font-medium">{t('table.description')}</th>
        </tr>
      </thead>
      <tbody>
        {history.map((item) => (
          <tr key={item.id} className="border-t align-top">
            <td className="px-4 py-3 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString(locale)}
            </td>
            <td className="px-4 py-3">{t(`types.${item.type}`)}</td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                  SOURCE_KIND_TONES[item.sourceKind],
                )}
              >
                {t(`sourceKinds.${item.sourceKind}`)}
              </span>
            </td>
            <td
              className={cn(
                'px-4 py-3 font-medium',
                item.amount > 0 ? 'text-emerald-700' : item.amount < 0 ? 'text-destructive' : 'text-foreground',
              )}
            >
              {item.amount > 0 ? '+' : ''}
              {formatCurrency(item.amount, locale)}
            </td>
            <td className="px-4 py-3">{formatCurrency(item.balance, locale)}</td>
            <td className="px-4 py-3 text-muted-foreground">
              {item.description || t('descriptionFallback')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  {historyTotal > HISTORY_PAGE_SIZE ? (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground">{historyPage} / {totalHistoryPages}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => goToHistoryPage(historyPage - 1)}
          disabled={historyPage <= 1}
          className="rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {commonT('previous')}
        </button>
        <button
          type="button"
          onClick={() => goToHistoryPage(historyPage + 1)}
          disabled={historyPage >= totalHistoryPages}
          className="rounded-md border px-3 py-1.5 typo-button text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {commonT('next')}
        </button>
      </div>
    </div>
  ) : null}
</div>
          )}
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="typo-body font-semibold">{t('adjustmentTitle')}</h2>
          <p className="mt-1 typo-body-sm text-muted-foreground">{t('adjustmentDescription')}</p>
          <form className="mt-4 grid gap-3" onSubmit={(event) => void submitAdjustment(event)}>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('adjustmentAmount')}
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t('adjustmentAmountPlaceholder')}
                required
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 typo-body-sm font-medium">
              {t('adjustmentReason')}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('adjustmentReasonPlaceholder')}
                rows={4}
                required
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={savingAdjustment || userId == null || amount.trim() === '' || reason.trim() === ''}
              className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {savingAdjustment ? t('adjusting') : t('adjust')}
            </button>
          </form>
        </section>
      </section>
    </div>
  );
}
