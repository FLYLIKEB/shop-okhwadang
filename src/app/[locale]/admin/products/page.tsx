'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { adminProductsApi } from '@/lib/api';
import type { Product } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import AdminPagination from '@/components/admin/AdminPagination';

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  active: '판매중',
  soldout: '품절',
  hidden: '숨김',
};

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const { isAdmin } = useAdminGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { execute: fetchProducts, isLoading: loading } = useAsyncAction(
    async () => {
      const params: { page: number; limit: number; status?: string } = {
        page,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter;
      const res = await adminProductsApi.getList(params);
      setProducts(res.items);
      setTotal(res.total);
    },
    { errorMessage: '상품 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void fetchProducts();
  }, [isAdmin, page, statusFilter, fetchProducts]);

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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          + 상품 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex gap-2">
        {[
          { label: '전체', value: '' },
          { label: '판매중', value: 'active' },
          { label: '임시저장', value: 'draft' },
          { label: '품절', value: 'soldout' },
          { label: '숨김', value: 'hidden' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-sm ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>
      ) : products.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">상품이 없습니다.</p>
      ) : (
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
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'soldout'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.isFeatured ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void handleToggleStatus(p)}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {p.status === 'active' ? '숨기기' : '노출'}
                      </button>
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => void handleDelete(p)}
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
      )}

      {/* 페이지네이션 */}
      <AdminPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
