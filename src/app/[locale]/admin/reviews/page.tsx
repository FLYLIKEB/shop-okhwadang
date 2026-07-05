'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminReviewsApi } from '@/lib/api';
import type { AdminReviewItem, AdminReviewsParams, SmartStoreReviewImportResult } from '@/lib/api';

const PAGE_SIZE = 20;
const reviewKey = (review: Pick<AdminReviewItem, 'id' | 'source'>) => `${review.source}:${review.id}`;

type ReviewFilters = {
  visibility: 'all' | 'visible' | 'hidden';
  rating: string;
  reviewType: string;
  hasMedia: string;
};

export default function AdminReviewsPage() {
  const t = useTranslations('admin.reviews');
  const locale = useLocale();
  const { isAdmin } = useAdminGuard();
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectedReview, setSelectedReview] = useState<AdminReviewItem | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [smartStoreFile, setSmartStoreFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<SmartStoreReviewImportResult | null>(null);
  const [importResult, setImportResult] = useState<SmartStoreReviewImportResult | null>(null);
  const [showAllImportRows, setShowAllImportRows] = useState(false);
  const [showFailedImportRowsOnly, setShowFailedImportRowsOnly] = useState(false);
  const { page, setPage, keyword, searchInput, setSearchInput, filters, setFilter, submitSearch } =
    useAdminListPage<ReviewFilters>({
      initialFilters: {
        visibility: 'all',
        rating: '',
        reviewType: '',
        hasMedia: '',
      },
    });

  const visibilityFilters = [
    { label: t('filters.visibility.all'), value: 'all' },
    { label: t('filters.visibility.visible'), value: 'visible' },
    { label: t('filters.visibility.hidden'), value: 'hidden' },
  ] as const;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  const { execute: fetchReviews, isLoading: loading } = useAsyncAction(
    async () => {
      const params: AdminReviewsParams = {
        page,
        limit: PAGE_SIZE,
        visibility: filters.visibility,
      };
      if (keyword) params.search = keyword;
      if (filters.rating) params.rating = Number(filters.rating);
      if (filters.reviewType) params.reviewType = filters.reviewType;
      if (filters.hasMedia) params.hasMedia = filters.hasMedia === 'true';

      const response = await adminReviewsApi.getList(params);
      setReviews(response.items);
      setTotal(response.total);
      setSelectedKeys(new Set());
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (isAdmin) void fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    page,
    keyword,
    filters.visibility,
    filters.rating,
    filters.reviewType,
    filters.hasMedia,
  ]);

  const { execute: previewSmartStoreImport, isLoading: previewingImport } = useAsyncAction(
    async (file: File) => {
      const result = await adminReviewsApi.previewSmartStoreImport(file);
      setImportPreview(result);
      setImportResult(null);
    },
    { successMessage: t('import.previewSuccess'), errorMessage: t('import.previewError') },
  );

  const { execute: commitSmartStoreImport, isLoading: committingImport } = useAsyncAction(
    async (file: File) => {
      const result = await adminReviewsApi.commitSmartStoreImport(file);
      setImportResult(result);
      setImportPreview(null);
      void fetchReviews();
    },
    { successMessage: t('import.commitSuccess'), errorMessage: t('import.commitError') },
  );

  const { execute: setVisibility } = useAsyncAction(
    async ({ id, isVisible, source }: { id: number; isVisible: boolean; source: string }) => {
      await adminReviewsApi.setVisibility(id, isVisible, source);
      toast.success(isVisible ? t('actions.showSuccess') : t('actions.hideSuccess'));
      void fetchReviews();
    },
    { errorMessage: t('actions.visibilityError') },
  );

  const { execute: saveReply, isLoading: savingReply } = useAsyncAction(
    async () => {
      if (!selectedReview) return;
      const updated = await adminReviewsApi.setReply(
        selectedReview.id,
        replyContent,
        undefined,
        selectedReview.source,
      );
      setSelectedReview(updated);
      setReviews((items) =>
        items.map((item) => (reviewKey(item) === reviewKey(updated) ? updated : item)),
      );
      toast.success(t('reply.saveSuccess'));
    },
    { errorMessage: t('reply.saveError') },
  );

  const { execute: bulkSetVisibility, isLoading: bulkUpdating } = useAsyncAction(
    async (isVisible: boolean) => {
      const keys = [...selectedKeys];
      if (keys.length === 0) {
        toast.error(t('bulk.selectFirst'));
        return;
      }
      const selectedItems = reviews
        .filter((review) => keys.includes(reviewKey(review)))
        .map((review) => ({ id: review.id, source: review.source }));
      const result = await adminReviewsApi.bulkSetVisibility(selectedItems, isVisible);
      toast.success(
        isVisible
          ? t('bulk.showSuccess', { count: result.updated })
          : t('bulk.hideSuccess', { count: result.updated }),
      );
      void fetchReviews();
    },
    { errorMessage: t('bulk.error') },
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSmartStoreFile(file);
    setImportPreview(null);
    setImportResult(null);
    setShowAllImportRows(false);
    setShowFailedImportRowsOnly(false);
  };

  const handlePreviewImport = () => {
    if (!smartStoreFile) {
      toast.error(t('import.selectFileFirst'));
      return;
    }
    void previewSmartStoreImport(smartStoreFile);
  };

  const handleCommitImport = () => {
    if (!smartStoreFile) {
      toast.error(t('import.selectFileFirst'));
      return;
    }
    void commitSmartStoreImport(smartStoreFile);
  };

  const toggleSelected = (review: AdminReviewItem) => {
    const key = reviewKey(review);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllVisibleRows = () => {
    setSelectedKeys((prev) => {
      const visibleKeys = reviews.map((review) => reviewKey(review));
      const allSelected = visibleKeys.length > 0 && visibleKeys.every((key) => prev.has(key));
      if (allSelected) return new Set([...prev].filter((key) => !visibleKeys.includes(key)));
      return new Set([...prev, ...visibleKeys]);
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const importSummary = importResult?.summary ?? importPreview?.summary;
  const allImportRows = importResult?.rows ?? importPreview?.rows ?? [];
  const visibleImportRows = showFailedImportRowsOnly
    ? allImportRows.filter((row) => row.status === 'failed')
    : allImportRows;
  const importRows = showAllImportRows ? visibleImportRows : visibleImportRows.slice(0, 5);
  const isImporting = previewingImport || committingImport;
  const allVisibleRowsSelected =
    reviews.length > 0 && reviews.every((review) => selectedKeys.has(reviewKey(review)));

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title={t('title')} />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="typo-body font-semibold">{t('import.title')}</h2>
            <p className="typo-body-sm text-muted-foreground">{t('import.description')}</p>
            <ul className="grid gap-1.5 rounded-md bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
              {['match', 'upsert', 'media', 'manualVisibility'].map((key) => (
                <li key={key} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-1.5 flex-shrink-0 rounded-full bg-foreground/40"
                  />
                  <span>{t(`import.scopeDetails.${key}`)}</span>
                </li>
              ))}
            </ul>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
              aria-label={t('import.fileLabel')}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreviewImport}
              disabled={!smartStoreFile || isImporting}
              className="rounded border px-4 py-2 typo-body-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewingImport ? t('import.previewing') : t('import.previewButton')}
            </button>
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={!smartStoreFile || isImporting || !importPreview}
              className="rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {committingImport ? t('import.committing') : t('import.commitButton')}
            </button>
          </div>
        </div>

        {importSummary && (
          <div className="mt-4 space-y-3 rounded-lg bg-secondary/40 p-4 typo-body-sm">
            {importResult?.importBatchId && (
              <p className="text-muted-foreground">
                {t('import.batchId', { id: importResult.importBatchId })}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
              <ImportSummaryItem
                label={t('import.summary.total')}
                value={importSummary.totalRows}
              />
              <ImportSummaryItem
                label={t('import.summary.create')}
                value={importSummary.createCount}
              />
              <ImportSummaryItem
                label={t('import.summary.update')}
                value={importSummary.updateCount}
              />
              <ImportSummaryItem label={t('import.summary.skip')} value={importSummary.skipCount} />
              <ImportSummaryItem
                label={t('import.summary.success')}
                value={importSummary.successCount}
              />
              <ImportSummaryItem
                label={t('import.summary.failure')}
                value={importSummary.failureCount}
              />
              <ImportSummaryItem
                label={t('import.summary.mediaFailure')}
                value={importSummary.mediaFailureCount}
              />
            </div>
            {importRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {visibleImportRows.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllImportRows((value) => !value)}
                      className="rounded border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      {showAllImportRows
                        ? t('import.showTopRows')
                        : t('import.showAllRows', { count: visibleImportRows.length })}
                    </button>
                  )}
                  {allImportRows.some((row) => row.status === 'failed') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowFailedImportRowsOnly((value) => !value);
                        setShowAllImportRows(true);
                      }}
                      className="rounded border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      {showFailedImportRowsOnly
                        ? t('import.showAllResults')
                        : t('import.showFailedRows')}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded border bg-background">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left">{t('import.columns.row')}</th>
                        <th className="px-3 py-2 text-left">
                          {t('import.columns.externalReviewId')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.columns.externalProductKey')}
                        </th>
                        <th className="px-3 py-2 text-left">{t('import.columns.productName')}</th>
                        <th className="px-3 py-2 text-left">{t('import.columns.action')}</th>
                        <th className="px-3 py-2 text-right">{t('import.columns.rating')}</th>
                        <th className="px-3 py-2 text-right">{t('import.columns.media')}</th>
                        <th className="px-3 py-2 text-left">{t('import.columns.result')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.externalReviewId ?? 'empty'}`}>
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.externalReviewId ?? t('emptyValue')}</td>
                          <td className="px-3 py-2">{row.externalProductKey ?? t('emptyValue')}</td>
                          <td className="px-3 py-2">{row.productName ?? t('emptyValue')}</td>
                          <td className="px-3 py-2">{t(`import.actions.${row.action}`)}</td>
                          <td className="px-3 py-2 text-right">{row.rating ?? t('emptyValue')}</td>
                          <td className="px-3 py-2 text-right">
                            {t('import.mediaCount', {
                              success: row.mediaSuccessCount,
                              total: row.mediaCount,
                            })}
                          </td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0
                              ? row.errors.join(', ')
                              : row.warnings.length > 0
                                ? row.warnings.join(', ')
                                : t(`import.status.${row.status}`)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <form onSubmit={submitSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-1">
            <span className="typo-label text-muted-foreground">{t('filters.searchLabel')}</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="typo-label text-muted-foreground">{t('filters.ratingLabel')}</span>
            <select
              value={filters.rating}
              onChange={(event) => setFilter('rating', event.target.value)}
              className="w-full rounded border bg-background px-3 py-2 typo-body-sm lg:w-32"
            >
              <option value="">{t('filters.ratingAll')}</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={String(rating)}>
                  {t('filters.ratingOption', { rating })}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="typo-label text-muted-foreground">{t('filters.mediaLabel')}</span>
            <select
              value={filters.hasMedia}
              onChange={(event) => setFilter('hasMedia', event.target.value)}
              className="w-full rounded border bg-background px-3 py-2 typo-body-sm lg:w-36"
            >
              <option value="">{t('filters.mediaAll')}</option>
              <option value="true">{t('filters.mediaOnly')}</option>
              <option value="false">{t('filters.textOnly')}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="typo-label text-muted-foreground">{t('filters.reviewTypeLabel')}</span>
            <input
              value={filters.reviewType}
              onChange={(event) => setFilter('reviewType', event.target.value)}
              placeholder={t('filters.reviewTypePlaceholder')}
              className="w-full rounded border bg-background px-3 py-2 typo-body-sm lg:w-40"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground hover:bg-primary/90"
          >
            {t('filters.searchButton')}
          </button>
        </form>

        <AdminFilterChips
          items={visibilityFilters}
          value={filters.visibility}
          onToggle={(value) => setFilter('visibility', value)}
          ariaLabel={t('filters.visibilityAria')}
          size="sm"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="typo-body-sm text-muted-foreground">
            {t('bulk.selectedCount', { count: selectedKeys.size })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void bulkSetVisibility(false)}
              disabled={selectedKeys.size === 0 || bulkUpdating}
              className="rounded border px-3 py-1.5 typo-body-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('bulk.hide')}
            </button>
            <button
              type="button"
              onClick={() => void bulkSetVisibility(true)}
              disabled={selectedKeys.size === 0 || bulkUpdating}
              className="rounded border px-3 py-1.5 typo-body-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('bulk.show')}
            </button>
          </div>
        </div>
      </section>

      <PaginatedAdminTableShell
        loading={loading}
        loadingMessage={t('loading')}
        isEmpty={reviews.length === 0}
        emptyMessage={t('noReviews')}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleRowsSelected}
                    onChange={toggleAllVisibleRows}
                    aria-label={t('table.selectAll')}
                  />
                </th>
                <th className="px-4 py-3 text-left">{t('table.product')}</th>
                <th className="px-4 py-3 text-left">{t('table.rating')}</th>
                <th className="px-4 py-3 text-left">{t('table.content')}</th>
                <th className="px-4 py-3 text-left">{t('table.reviewer')}</th>
                <th className="px-4 py-3 text-left">{t('table.reviewedAt')}</th>
                <th className="px-4 py-3 text-left">{t('table.media')}</th>
                <th className="px-4 py-3 text-left">{t('table.status')}</th>
                <th className="px-4 py-3 text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map((review) => (
                <tr key={reviewKey(review)} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(reviewKey(review))}
                      onChange={() => toggleSelected(review)}
                      aria-label={t('table.selectOne', { id: review.externalReviewId })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {review.product ? (
                      <Link
                        href={`/admin/products/${review.product.id}/edit`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {review.product.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{t('table.unmatchedProduct')}</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {review.externalProductId ?? t('emptyValue')}
                    </div>
                  </td>
                  <td className="px-4 py-3">{t('table.ratingValue', { rating: review.rating })}</td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="line-clamp-2">{review.content ?? t('table.noContent')}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {review.externalReviewId}
                    </div>
                  </td>
                  <td className="px-4 py-3">{review.reviewerNameMasked}</td>
                  <td className="px-4 py-3">{dateFormatter.format(new Date(review.reviewedAt))}</td>
                  <td className="px-4 py-3">
                    {review.mediaCount > 0
                      ? t('table.mediaValue', { count: review.mediaCount })
                      : t('emptyValue')}
                    {review.mediaFailureCount > 0 && (
                      <div className="text-xs text-destructive">
                        {t('table.mediaFailure', { count: review.mediaFailureCount })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        review.isVisible
                          ? 'rounded bg-primary/10 px-2 py-1 text-xs text-primary'
                          : 'rounded bg-destructive/10 px-2 py-1 text-xs text-destructive'
                      }
                    >
                      {review.isVisible ? t('status.visible') : t('status.hidden')}
                    </span>
                    {review.isBest && (
                      <div className="mt-1 text-xs text-muted-foreground">{t('status.best')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReview(review);
                          setReplyContent(review.adminReplyContent ?? '');
                        }}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {t('actions.detail')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void setVisibility({
                            id: review.id,
                            isVisible: !review.isVisible,
                            source: review.source,
                          })
                        }
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {review.isVisible ? t('actions.hide') : t('actions.show')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PaginatedAdminTableShell>

      {selectedReview && (
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="typo-body font-semibold">
              {t('detail.title', { id: selectedReview.externalReviewId })}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedReview(null)}
              className="rounded border px-3 py-1 typo-body-sm hover:bg-secondary"
            >
              {t('detail.close')}
            </button>
          </div>
          <dl className="grid gap-3 typo-body-sm md:grid-cols-2">
            <DetailItem
              label={t('detail.product')}
              value={selectedReview.product?.name ?? t('table.unmatchedProduct')}
            />
            <DetailItem
              label={t('detail.orderNo')}
              value={selectedReview.orderNo ?? t('emptyValue')}
            />
            <DetailItem
              label={t('detail.reviewType')}
              value={selectedReview.reviewType ?? t('emptyValue')}
            />
            <DetailItem
              label={t('detail.helpfulCount')}
              value={String(selectedReview.helpfulCount)}
            />
            <DetailItem
              label={t('detail.sourceDisplayStatus')}
              value={selectedReview.sourceDisplayStatus ?? t('emptyValue')}
            />
            <DetailItem
              label={t('detail.importBatchId')}
              value={selectedReview.importBatchId ?? t('emptyValue')}
            />
          </dl>
          <div className="mt-4 space-y-2">
            <h3 className="typo-label text-muted-foreground">{t('detail.content')}</h3>
            <p className="whitespace-pre-wrap rounded border bg-background p-3 typo-body-sm">
              {selectedReview.content ?? t('table.noContent')}
            </p>
          </div>
          {selectedReview.relatedReviewContent && (
            <div className="mt-4 space-y-2">
              <h3 className="typo-label text-muted-foreground">{t('detail.relatedContent')}</h3>
              <p className="whitespace-pre-wrap rounded border bg-background p-3 typo-body-sm">
                {selectedReview.relatedReviewContent}
              </p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <h3 className="typo-label text-muted-foreground">{t('reply.title')}</h3>
            <textarea
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              rows={4}
              className="w-full rounded border bg-background p-3 typo-body-sm"
              placeholder={t('reply.placeholder')}
            />
            <button
              type="button"
              onClick={() => void saveReply()}
              disabled={savingReply}
              className="rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground disabled:opacity-50"
            >
              {t('reply.save')}
            </button>
          </div>
          {selectedReview.imageUrls && selectedReview.imageUrls.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="typo-label text-muted-foreground">{t('detail.media')}</h3>
              <ul className="space-y-1 typo-body-sm">
                {selectedReview.imageUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ImportSummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="typo-h3 font-semibold">{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-background p-3">
      <dt className="typo-label text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
