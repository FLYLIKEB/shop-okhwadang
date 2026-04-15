'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { productsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import ProductFormPage from '@/components/shared/admin/ProductFormPage';

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
      const p = await productsApi.getById(id);
      setProduct(p);
    },
    { onError: () => setNotFound(true), errorMessage: '상품을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground">상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return <ProductFormPage mode="edit" product={product} />;
}
