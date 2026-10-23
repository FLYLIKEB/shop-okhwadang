'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminProductsApi } from '@/lib/api';
import type { Product, SmartStoreProductImportResult } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { ProductStatusBadge } from '@/components/shared/admin/StatusBadge';
import type { ProductStatus } from '@/constants/status';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { ConfirmDialog } from '@/components/shared/admin/ConfirmDialog';
import { localMessage } from '@/utils/localMessages';

import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
  const tCommon = useTranslations('admin.common');
  const { isAdmin } = useAdminGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [importPreview, setImportPreview] = useState<SmartStoreProductImportResult | null>(null);
  const [importResult, setImportResult] = useState<SmartStoreProductImportResult | null>(null);
  const [showAllImportRows, setShowAllImportRows] = useState(false);
  const [showFailedImportRowsOnly, setShowFailedImportRowsOnly] = useState(false);
  const [selectedNaverIdentifiers, setSelectedNaverIdentifiers] = useState<Set<string>>(
    new Set(),
  );
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { page, setPage, filters, setFilter, resetFilters, hasActiveFilters } = useAdminListPage({
    initialFilters: {
      status: '',
      isPreOrder: '',
    },
  });

  const statusLabels: Record<ProductStatus, string> = {
    draft: t('status.draft'),
    active: t('status.active'),
    soldout: t('status.soldout'),
    hidden: t('status.hidden'),
  };

  const statusFilters = [
    { label: t('statusFilter.all'), value: '' },
    { label: t('statusFilter.active'), value: 'active' },
    { label: t('statusFilter.draft'), value: 'draft' },
    { label: t('statusFilter.soldout'), value: 'soldout' },
    { label: t('statusFilter.hidden'), value: 'hidden' },
  ] as const;

  const { execute: fetchProducts, isLoading: loading } = useAsyncAction(
    async () => {
      setLoadError(false);
      const params: { page: number; limit: number; status?: string; isPreOrder?: boolean } = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.status) params.status = filters.status;
      if (filters.isPreOrder) params.isPreOrder = filters.isPreOrder === 'true';

      const res = await adminProductsApi.getList(params);
      setProducts(res.items);
      setTotal(res.total);
    },
    { errorMessage: t('loadError'), onError: () => setLoadError(true) },
  );

  useEffect(() => {
    if (isAdmin) void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status, filters.isPreOrder]);

  const { execute: previewNaverCommerceImport, isLoading: previewingNaverCommerce } =
    useAsyncAction(
      async () => {
        const result = await adminProductsApi.previewNaverCommerceImport();
        setImportPreview(result);
        setImportResult(null);
        setShowAllImportRows(false);
        setShowFailedImportRowsOnly(false);
        setSelectedNaverIdentifiers(new Set());
      },
      {
        successMessage: t('naverCommerce.previewSuccess'),
        errorMessage: t('naverCommerce.previewError'),
      },
    );

  const { execute: commitNaverCommerceImport, isLoading: committingNaverCommerce } = useAsyncAction(
    async (selectedIdentifiers: string[]) => {
      const result = await adminProductsApi.commitNaverCommerceImport(selectedIdentifiers);
      setImportResult(result);
      setImportPreview(null);
      setSelectedNaverIdentifiers(new Set());
      void fetchProducts();
    },
    {
      successMessage: t('naverCommerce.commitSuccess'),
      errorMessage: t('naverCommerce.commitError'),
    },
  );

  const { execute: toggleStatus } = useAsyncAction(
    async (product: Product) => {
      const next = product.status === 'active' ? 'hidden' : 'active';
      await adminProductsApi.update(product.id, { status: next });
      toast.success(t('statusChanged', { status: statusLabels[next as ProductStatus] }));
      void fetchProducts();
    },
    { errorMessage: t('statusChangeError') },
  );

  const { execute: toggleLocaleVisibility } = useAsyncAction(
    async ({ product, locale }: { product: Product; locale: 'ko' | 'en' }) => {
      const field = locale === 'ko' ? 'isVisibleKo' : 'isVisibleEn';
      const current = field === 'isVisibleKo' ? product.isVisibleKo ?? true : product.isVisibleEn ?? false;
      const next = !current;
      await adminProductsApi.update(product.id, { [field]: next });
      toast.success(t('localeVisibilityChanged', { locale: locale.toUpperCase(), status: next ? t('visible') : t('hidden') }));
      void fetchProducts();
    },
    { errorMessage: t('localeVisibilityChangeError') },
  );

  const { execute: deleteProduct } = useAsyncAction(
    async (product: Product) => {
      await adminProductsApi.remove(product.id);
      void fetchProducts();
    },
    { successMessage: t('deleteSuccess'), errorMessage: t('deleteError') },
  );

  const handlePreviewNaverCommerce = () => {
    void previewNaverCommerceImport();
  };

  const handleCommitNaverCommerce = () => {
    if (selectedNaverIdentifiers.size === 0) {
      toast.error(t('naverCommerce.selectProducts'));
      return;
    }
    void commitNaverCommerceImport(Array.from(selectedNaverIdentifiers));
  };

  const handleToggleStatus = (product: Product) => void toggleStatus(product);

  const handleToggleLocaleVisibility = (product: Product, locale: 'ko' | 'en') =>
    void toggleLocaleVisibility({ product, locale });

  const handleDelete = (product: Product) => {
    setProductPendingDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (!productPendingDelete) return;
    const product = productPendingDelete;
    setProductPendingDelete(null);
    void deleteProduct(product);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const importSummary = importResult?.summary ?? importPreview?.summary;
  const allImportRows = importResult?.rows ?? importPreview?.rows ?? [];
  const isNaverPreviewActive = importPreview !== null;
  const selectableNaverRows = allImportRows.filter(
    (row) => row.identifier !== null && row.status !== 'failed',
  );
  const allNaverRowsSelected =
    selectableNaverRows.length > 0 &&
    selectableNaverRows.every((row) => selectedNaverIdentifiers.has(row.identifier as string));
  const visibleImportRows = showFailedImportRowsOnly
    ? allImportRows.filter((row) => row.status === 'failed')
    : allImportRows;
  const importRows = showAllImportRows ? visibleImportRows : visibleImportRows.slice(0, 5);
  const isImporting =
    previewingNaverCommerce || committingNaverCommerce;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader
        title={t('title')}
        action={
          <Button asChild variant="primary">
            <Link href="/admin/products/new">{t('addProduct')}</Link>
          </Button>
        }
      />

      <section className="surface-card p-4">
        <div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="font-semibold typo-body-sm">{t('naverCommerce.title')}</h2>
              <p className="typo-body-sm text-muted-foreground">{t('naverCommerce.description')}</p>
              <p className="typo-body-sm text-muted-foreground">{t('naverCommerce.excelClosed')}</p>
              {isNaverPreviewActive && (
                <p className="text-sm font-medium text-tea dark:text-primary">
                  {t('naverCommerce.selectedCount', {
                    selected: selectedNaverIdentifiers.size,
                    total: selectableNaverRows.length,
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviewNaverCommerce}
                disabled={isImporting}
                className="rounded border px-4 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewingNaverCommerce
                  ? t('naverCommerce.previewing')
                  : t('naverCommerce.previewButton')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCommitNaverCommerce}
                disabled={
                  isImporting ||
                  !importPreview ||
                  selectedNaverIdentifiers.size === 0
                }
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {committingNaverCommerce
                  ? t('naverCommerce.committing')
                  : t('naverCommerce.commitButton')}
              </Button>
            </div>
          </div>
        </div>

        {importSummary && (
          <div className="mt-4 space-y-3 surface-card bg-secondary/40 p-4 typo-body-sm">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
            </div>
            {importRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {visibleImportRows.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setShowAllImportRows((value) => !value)}
                      className="rounded border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      {showAllImportRows
                        ? t('import.showTopRows')
                        : t('import.showAllRows', { count: visibleImportRows.length })}
                    </Button>
                  )}
                  {allImportRows.some((row) => row.status === 'failed') && (
                    <Button
                      variant="outline"
                      size="sm"
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
                    </Button>
                  )}
                </div>
                <div className="surface-card overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="admin-table-head">
                      <tr>
                        {isNaverPreviewActive && (
                          <th className="px-3 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={allNaverRowsSelected}
                              onChange={(event) => {
                                setSelectedNaverIdentifiers(
                                  event.target.checked
                                    ? new Set(
                                        selectableNaverRows.flatMap((row) =>
                                          row.identifier ? [row.identifier] : [],
                                        ),
                                      )
                                    : new Set(),
                                );
                              }}
                              aria-label={t('naverCommerce.selectAll')}
                            />
                          </th>
                        )}
                        <th className="px-3 py-2 text-left">{t('import.previewColumns.row')}</th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.identifier')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.productName')}
                        </th>
                        <th className="px-3 py-2 text-left">{t('import.previewColumns.action')}</th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.matchedProduct')}
                        </th>
                        <th className="px-3 py-2 text-right">{t('import.previewColumns.price')}</th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.discount')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.freeShipping')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.noticeInfo')}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {t('import.previewColumns.stock')}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {t('import.previewColumns.optionStockTotal')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.stockSource')}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {t('import.previewColumns.automaticMapping')}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {t('import.previewColumns.options')}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {t('import.previewColumns.galleryImages')}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {t('import.previewColumns.detailImages')}
                        </th>
                        <th className="px-3 py-2 text-left">{t('import.previewColumns.result')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft">
                      {importRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.identifier ?? 'empty'}`}>
                          {isNaverPreviewActive && (
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={
                                  row.identifier !== null &&
                                  selectedNaverIdentifiers.has(row.identifier)
                                }
                                disabled={row.identifier === null || row.status === 'failed'}
                                onChange={(event) => {
                                  if (!row.identifier) return;
                                  setSelectedNaverIdentifiers((current) => {
                                    const next = new Set(current);
                                    if (event.target.checked) next.add(row.identifier as string);
                                    else next.delete(row.identifier as string);
                                    return next;
                                  });
                                }}
                                aria-label={t('naverCommerce.selectProduct', {
                                  name: row.productName ?? row.identifier ?? '',
                                })}
                              />
                            </td>
                          )}
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.identifier ?? '-'}</td>
                          <td className="px-3 py-2">{row.productName ?? '-'}</td>
                          <td className="px-3 py-2">{t(`import.actions.${row.action}`)}</td>
                          <td className="px-3 py-2">
                            {row.productId ? (
                              <Link
                                href={`/admin/products/${row.productId}/edit`}
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {t('import.previewValues.productLink', { id: row.productId })}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">
                                {t('import.previewValues.notLinked')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.price != null ? formatCurrency(row.price) : '-'}
                          </td>
                          <td className="px-3 py-2">
                            {row.hasDiscount && row.salePrice != null
                              ? t('import.previewValues.discountApplied', {
                                  salePrice: formatCurrency(row.salePrice),
                                })
                              : t('import.previewValues.discountNone')}
                          </td>
                          <td className="px-3 py-2">
                            {row.isFreeShipping == null
                              ? t('import.previewValues.unknown')
                              : row.isFreeShipping
                                ? t('import.previewValues.yes')
                                : t('import.previewValues.no')}
                          </td>
                          <td className="px-3 py-2">
                            {row.hasNoticeInfo
                              ? t('import.previewValues.yes')
                              : t('import.previewValues.no')}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.stock == null ? '-' : row.stock}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.optionStockTotal == null ? '-' : row.optionStockTotal}
                          </td>
                          <td className="px-3 py-2">
                            {t(`import.stockSources.${row.stockSource}`)}
                          </td>
                          <td className="min-w-56 px-3 py-2">
                            <ImportMappingSummary row={row} t={t} />
                          </td>
                          <td className="px-3 py-2 text-right">{row.optionCount ?? 0}</td>
                          <td className="px-3 py-2 text-right">{row.galleryImageCount ?? 0}</td>
                          <td className="px-3 py-2 text-right">{row.detailImageCount ?? 0}</td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0
                              ? row.errors.join(', ')
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

      <div className="flex flex-wrap items-center gap-2">
        <AdminFilterChips
          items={statusFilters}
          value={filters.status}
          onToggle={(value) => setFilter('status', value)}
          ariaLabel={t('statusFilterAria')}
          size="sm"
        />
        <AdminFilterChips
          items={[
            { label: t('purchaseTypeAll'), value: '' },
            { label: t('purchaseTypePreOrder'), value: 'true' },
            { label: t('purchaseTypeRegular'), value: 'false' },
          ]}
          value={filters.isPreOrder}
          onToggle={(value) => setFilter('isPreOrder', value)}
          ariaLabel={t('purchaseTypeFilter')}
          size="sm"
        />
        {hasActiveFilters && (
          <Button type="button" onClick={resetFilters} variant="outline" size="sm">
            {tCommon('resetFilters')}
          </Button>
        )}
      </div>

      <PaginatedAdminTableShell
        loading={loading}
        error={loadError}
        errorMessage={loadError ? t('loadError') : undefined}
        errorAction={
          <Button type="button" onClick={() => void fetchProducts()} variant="outline" size="sm">
            {localMessage('ui.retry')}
          </Button>
        }
        loadingMessage={t('loading')}
        isEmpty={products.length === 0}
        emptyMessage={t('noProducts')}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="admin-table-head">
              <tr>
                <th className="px-4 py-3 text-left">{t('columns.id')}</th>
                <th className="px-4 py-3 text-left">{t('columns.name')}</th>
                <th className="px-4 py-3 text-left">{t('columns.price')}</th>
                <th className="px-4 py-3 text-left">{t('columns.status')}</th>
                <th className="px-4 py-3 text-left">{t('columns.localeVisibility')}</th>
                <th className="px-4 py-3 text-left">{t('columns.featured')}</th>
                <th className="px-4 py-3 text-left">{t('columns.freeShipping')}</th>
                <th className="px-4 py-3 text-right">{t('columns.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-muted-foreground">{product.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {product.name}
                    {product.isPreOrder && (
                      <p className="mt-1 typo-label text-muted-foreground">
                        {t('purchaseTypePreOrder')} · {product.preOrderShippingDate}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" aria-label={t('localeVisibilityAria', { name: product.name })}>
                      <LocaleVisibilityButton
                        label={t('localeKoShort')}
                        visible={product.isVisibleKo ?? true}
                        onClick={() => handleToggleLocaleVisibility(product, 'ko')}
                      />
                      <LocaleVisibilityButton
                        label={t('localeEnShort')}
                        visible={product.isVisibleEn ?? false}
                        onClick={() => handleToggleLocaleVisibility(product, 'en')}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.isFeatured ? '✓' : '-'}</td>
                  <td className="px-4 py-3">
                    {product.isFreeShipping ? (
                      <span className="inline-flex rounded-sm bg-foreground/85 px-2 py-0.5 text-xs text-background">
                        {t('columns.freeShipping')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleToggleStatus(product)}
                      >
                        {product.status === 'active' ? t('actions.hide') : t('actions.show')}
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link
                        href={`/admin/products/${product.id}/edit`}
                      >
                        {t('actions.edit')}
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(product)}
                      >
                        {t('actions.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PaginatedAdminTableShell>
      <ConfirmDialog
        open={productPendingDelete !== null}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description', { name: productPendingDelete?.name ?? '' })}
        confirmLabel={t('deleteDialog.confirm')}
        cancelLabel={t('deleteDialog.cancel')}
        destructive
        onCancel={() => setProductPendingDelete(null)}
        onConfirm={confirmDeleteProduct}
      />
    </div>
  );
}


function LocaleVisibilityButton({
  label,
  visible,
  onClick,
}: {
  label: string;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={visible ? 'primary' : 'outline'}
      onClick={onClick}
      aria-pressed={visible}
      className="typo-label font-medium"
    >
      {label}
    </Button>
  );
}

function ImportSummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-soft bg-background p-3">
      <div className="typo-label text-muted-foreground">{label}</div>
      <div className="typo-heading-sm">{value}</div>
    </div>
  );
}

function ImportMappingSummary({
  row,
  t,
}: {
  row: SmartStoreProductImportResult['rows'][number];
  t: ReturnType<typeof useTranslations<'admin.products'>>;
}) {
  const mapping = row.automaticMapping;
  if (!mapping || mapping.status === 'none') {
    return <span className="text-muted-foreground">{t('import.mappingStatus.none')}</span>;
  }

  const parts = [
    mapping.category
      ? t('import.mappingValues.category', { value: mapping.category.displayName })
      : null,
    ...mapping.attributes.map((attribute) => `${attribute.code}: ${attribute.displayValue}`),
    ...mapping.options.map((option) => `${option.name}: ${option.value}`),
    mapping.noticeInfoType
      ? t('import.mappingValues.noticeInfo', {
          value: t(`import.noticeInfoTypes.${mapping.noticeInfoType}`),
        })
      : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="space-y-1">
      <span
        className={
          mapping.status === 'needs_review' ? 'font-medium text-amber-700 dark:text-amber-300' : 'font-medium text-tea dark:text-primary'
        }
      >
        {t(`import.mappingStatus.${mapping.status}`)}
      </span>
      <p className="text-muted-foreground">{parts.join(' · ')}</p>
      {row.mappingWarnings.length > 0 && (
        <p className="text-amber-700 dark:text-amber-300">{row.mappingWarnings.join(' / ')}</p>
      )}
    </div>
  );
}
