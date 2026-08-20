'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import ProductFormPage from '@/components/shared/admin/ProductFormPage';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminErrorState, AdminLoadingState } from '@/components/shared/admin/AdminStates';

export default function AdminProductEditPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { execute: loadProduct, isLoading: loading } = useAsyncAction(
    async () => {
      const id = Number(params.id);
      if (isNaN(id)) {
        setNotFound(true);
        return;
      }
      const p = await adminProductsApi.getById(id);
      setProduct(p);
    },
    { onError: () => setNotFound(true), errorMessage: '상품을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <AdminPageHeader title="상품 수정" />
        <AdminLoadingState title="불러오는 중..." />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <AdminPageHeader title="상품 수정" />
        <AdminErrorState title="상품을 찾을 수 없습니다." />
      </div>
    );
  }

  return <ProductFormPage mode="edit" product={product} />;
}
