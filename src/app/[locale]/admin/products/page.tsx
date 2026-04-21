'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminProductsApi } from '@/lib/api';
import type { Product } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { ProductStatusBadge } from '@/components/shared/admin/StatusBadge';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  active: '판매중',
  soldout: '품절',
  hidden: '숨김',
};

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '판매중', value: 'active' },
  { label: '임시저장', value: 'draft' },
  { label: '품절', value: 'soldout' },
  { label: '숨김', value: 'hidden' },
] as const;

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const { isAdmin } = useAdminGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const { page, setPage, filters, setFilter } = useAdminListPage({
    initialFilters: {
      status: '',
    },
  });

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
    { errorMessage: '상품 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status]);

  const { execute: toggleStatus } = useAsyncAction(
    async (product: Product) => {
      const next = product.status === 'active' ? 'hidden' : 'active';
      await adminProductsApi.update(product.id, { status: next });
      toast.success(`상품이 ${STATUS_LABELS[next]}으로 변경되었습니다.`);
      void fetchProducts();
    },
    { errorMessage: '상태 변경에 실패했습니다.' },
  );

  const { execute: deleteProduct } = useAsyncAction(
    async (product: Product) => {
      await adminProductsApi.remove(product.id);
      void fetchProducts();
    },
    { successMessage: '상품이 삭제되었습니다.', errorMessage: '삭제에 실패했습니다.' },
  );

  const handleToggleStatus = (product: Product) => void toggleStatus(product);

  const handleDelete = (product: Product) => {
    if (!window.confirm(`"${product.name}"을(를) 삭제하시겠습니까?`)) return;
    void deleteProduct(product);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader
        title="상품 관리"
        action={(
          <Link
            href="/admin/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            + 상품 등록
          </Link>
        )}
      />

      <AdminFilterChips
        items={STATUS_FILTERS}
        value={filters.status}
        onToggle={(value) => setFilter('status', value)}
        ariaLabel="상품 상태 필터"
        size="sm"
      />

      <PaginatedAdminTableShell
        loading={loading}
        loadingMessage="불러오는 중..."
        isEmpty={products.length === 0}
        emptyMessage="상품이 없습니다."
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">상품명</th>
                <th className="px-4 py-3 text-left">가격</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">추천</th>
                <th className="px-4 py-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-muted-foreground">{product.id}</td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status as 'active' | 'soldout' | 'draft' | 'hidden'} />
                  </td>
                  <td className="px-4 py-3">{product.isFeatured ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void handleToggleStatus(product)}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {product.status === 'active' ? '숨기기' : '노출'}
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => void handleDelete(product)}
                        className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        삭제
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
