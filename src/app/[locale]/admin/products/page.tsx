'use client';

import { ChangeEvent, useEffect, useState } from 'react';
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
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';

const PAGE_SIZE = 20;

type ProductStatus = 'active' | 'soldout' | 'draft' | 'hidden';

export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
  const { isAdmin } = useAdminGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [smartStoreFile, setSmartStoreFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<SmartStoreProductImportResult | null>(null);
  const [importResult, setImportResult] = useState<SmartStoreProductImportResult | null>(null);
  const [showAllImportRows, setShowAllImportRows] = useState(false);
  const [showFailedImportRowsOnly, setShowFailedImportRowsOnly] = useState(false);
  const { page, setPage, filters, setFilter } = useAdminListPage({
    initialFilters: {
      status: '',
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
      const params: { page: number; limit: number; status?: string } = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.status) params.status = filters.status;

      const res = await adminProductsApi.getList(params);
      setProducts(res.items);
      setTotal(res.total);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (isAdmin) void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status]);

  const { execute: previewSmartStoreImport, isLoading: previewingImport } = useAsyncAction(
    async (file: File) => {
      const result = await adminProductsApi.previewSmartStoreImport(file);
      setImportPreview(result);
      setImportResult(null);
    },
    { successMessage: t('import.previewSuccess'), errorMessage: t('import.previewError') },
  );

  const { execute: commitSmartStoreImport, isLoading: committingImport } = useAsyncAction(
    async (file: File) => {
      const result = await adminProductsApi.commitSmartStoreImport(file);
      setImportResult(result);
      setImportPreview(null);
      void fetchProducts();
    },
    { successMessage: t('import.commitSuccess'), errorMessage: t('import.commitError') },
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

  const { execute: deleteProduct } = useAsyncAction(
    async (product: Product) => {
      await adminProductsApi.remove(product.id);
      void fetchProducts();
    },
    { successMessage: t('deleteSuccess'), errorMessage: t('deleteError') },
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

  const handleToggleStatus = (product: Product) => void toggleStatus(product);

  const handleDelete = (product: Product) => {
    if (!window.confirm(t('deleteConfirm', { name: product.name }))) return;
    void deleteProduct(product);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const importSummary = importResult?.summary ?? importPreview?.summary;
  const allImportRows = importResult?.rows ?? importPreview?.rows ?? [];
  const visibleImportRows = showFailedImportRowsOnly
    ? allImportRows.filter((row) => row.status === 'failed')
    : allImportRows;
  const importRows = showAllImportRows ? visibleImportRows : visibleImportRows.slice(0, 5);
  const isImporting = previewingImport || committingImport;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader
        title={t('title')}
        action={(
          <Link
            href="/admin/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            {t('addProduct')}
          </Link>
        )}
      />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">{t('import.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('import.description')}</p>
            <p className="text-sm text-muted-foreground">{t('import.supportedFormats')}</p>
            <p className="text-sm text-muted-foreground">{t('import.supportedScope')}</p>
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
              className="rounded border px-4 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewingImport ? t('import.previewing') : t('import.previewButton')}
            </button>
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={!smartStoreFile || isImporting || !importPreview}
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {committingImport ? t('import.committing') : t('import.commitButton')}
            </button>
          </div>
        </div>

        {importSummary && (
          <div className="mt-4 space-y-3 rounded-lg bg-secondary/40 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <ImportSummaryItem label={t('import.summary.total')} value={importSummary.totalRows} />
              <ImportSummaryItem label={t('import.summary.create')} value={importSummary.createCount} />
              <ImportSummaryItem label={t('import.summary.update')} value={importSummary.updateCount} />
              <ImportSummaryItem label={t('import.summary.skip')} value={importSummary.skipCount} />
              <ImportSummaryItem label={t('import.summary.success')} value={importSummary.successCount} />
              <ImportSummaryItem label={t('import.summary.failure')} value={importSummary.failureCount} />
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
                      {showAllImportRows ? t('import.showTopRows') : t('import.showAllRows', { count: visibleImportRows.length })}
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
                      {showFailedImportRowsOnly ? t('import.showAllResults') : t('import.showFailedRows')}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded border bg-background">
                  <table className="w-full text-xs">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left">{t('import.previewColumns.row')}</th>
                      <th className="px-3 py-2 text-left">{t('import.previewColumns.identifier')}</th>
                      <th className="px-3 py-2 text-left">{t('import.previewColumns.productName')}</th>
                      <th className="px-3 py-2 text-left">{t('import.previewColumns.action')}</th>
                      <th className="px-3 py-2 text-left">{t('import.previewColumns.result')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importRows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.identifier ?? 'empty'}`}>
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.identifier ?? '-'}</td>
                        <td className="px-3 py-2">{row.productName ?? '-'}</td>
                        <td className="px-3 py-2">{t(`import.actions.${row.action}`)}</td>
                        <td className="px-3 py-2">
                          {row.errors.length > 0 ? row.errors.join(', ') : t(`import.status.${row.status}`)}
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

      <AdminFilterChips
        items={statusFilters}
        value={filters.status}
        onToggle={(value) => setFilter('status', value)}
        ariaLabel={t('statusFilterAria')}
        size="sm"
      />

      <PaginatedAdminTableShell
        loading={loading}
        loadingMessage={t('loading')}
        isEmpty={products.length === 0}
        emptyMessage={t('noProducts')}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left">{t('columns.id')}</th>
                <th className="px-4 py-3 text-left">{t('columns.name')}</th>
                <th className="px-4 py-3 text-left">{t('columns.price')}</th>
                <th className="px-4 py-3 text-left">{t('columns.status')}</th>
                <th className="px-4 py-3 text-left">{t('columns.featured')}</th>
                <th className="px-4 py-3 text-right">{t('columns.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-muted-foreground">{product.id}</td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status as ProductStatus} />
                  </td>
                  <td className="px-4 py-3">{product.isFeatured ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void handleToggleStatus(product)}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {product.status === 'active' ? t('actions.hide') : t('actions.show')}
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {t('actions.edit')}
                      </Link>
                      <button
                        onClick={() => void handleDelete(product)}
                        className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        {t('actions.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PaginatedAdminTableShell>
    </div>
  );
}

function ImportSummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
