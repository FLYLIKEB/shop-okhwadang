'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminLocalizationApi } from '@/lib/api';
import type {
  LocalizationCoverageReport,
  LocalizationMissingItem,
  LocalizationResourceKind,
} from '@/lib/api';

const KIND_ORDER: LocalizationResourceKind[] = [
  'product',
  'category',
  'productOption',
  'page',
  'pageBlock',
  'navigation',
  'externalReview',
];

export default function AdminLocalizationPage() {
  const t = useTranslations('admin.localization');
  const { isAdmin } = useAdminGuard();
  const [report, setReport] = useState<LocalizationCoverageReport | null>(null);

  const { execute: loadCoverage, isLoading } = useAsyncAction(
    async () => {
      const data = await adminLocalizationApi.getCoverage();
      setReport(data);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (isAdmin) void loadCoverage();
  }, [isAdmin, loadCoverage]);

  const sortedItems = useMemo(() => {
    if (!report) return [];
    return [...report.items].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }, [report]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        meta={<p className="typo-body-sm text-muted-foreground">{t('description')}</p>}
        className="items-start"
      />

      <section className="surface-card p-5">
        <h2 className="typo-h3 mb-3">{t('fallbackTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <PolicyCard label={t('defaultPolicy')} value={t('koFallback')} />
          <PolicyCard label={t('smartStorePolicy')} value={t('sourceTextFallback')} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(report?.summaries ?? []).map((summary) => (
          <div key={summary.kind} className="surface-card p-5">
            <p className="typo-body-sm text-muted-foreground">{t(`kinds.${summary.kind}`)}</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="typo-h2">{summary.missing}</p>
              <p className="typo-body-sm text-muted-foreground">
                {t('summaryRatio', { complete: summary.complete, total: summary.total })}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="surface-card">
        <div className="border-soft border-b p-5">
          <h2 className="typo-h3">{t('missingTitle')}</h2>
          <p className="typo-body-sm mt-1 text-muted-foreground">{t('missingDescription')}</p>
        </div>
        {isLoading && !report ? (
          <AdminLoadingState title={t('loading')} className="border-0" />
        ) : sortedItems.length === 0 ? (
          <AdminEmptyState title={t('empty')} className="border-0" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 typo-label">{t('table.kind')}</th>
                  <th className="px-4 py-3 typo-label">{t('table.item')}</th>
                  <th className="px-4 py-3 typo-label">{t('table.fields')}</th>
                  <th className="px-4 py-3 typo-label">{t('table.policy')}</th>
                  <th className="px-4 py-3 typo-label">{t('table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <MissingRow key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PolicyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-4">
      <p className="typo-label text-muted-foreground">{label}</p>
      <p className="typo-body-sm mt-2 text-foreground">{value}</p>
    </div>
  );
}

function MissingRow({ item }: { item: LocalizationMissingItem }) {
  const t = useTranslations('admin.localization');
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 typo-body-sm">{t(`kinds.${item.kind}`)}</td>
      <td className="px-4 py-3 typo-body-sm">{item.label}</td>
      <td className="px-4 py-3 typo-body-sm text-muted-foreground">{item.missingFields.join(', ')}</td>
      <td className="px-4 py-3 typo-body-sm text-muted-foreground">{t(item.fallbackPolicy)}</td>
      <td className="px-4 py-3 typo-body-sm">
        {item.editHref ? (
          <Link href={item.editHref} className="font-medium text-primary hover:underline">
            {t('edit')}
          </Link>
        ) : (
          <span className="text-muted-foreground">{t('notAvailable')}</span>
        )}
      </td>
    </tr>
  );
}
