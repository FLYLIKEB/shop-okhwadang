'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import ProductFormPage from '@/components/shared/admin/ProductFormPage';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminErrorState, AdminLoadingState } from '@/components/shared/admin/AdminStates';

export default function AdminProductEditPage() {
  const params = useParams();
  const t = useTranslations('admin.products');
  const tForm = useTranslations('admin.productForm');
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { execute: loadProduct, isLoading: loading } = useAsyncAction(
    async (id: number) => adminProductsApi.getById(id),
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setNotFound(false);
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setNotFound(true);
      return;
    }
    void loadProduct(id).then((loaded) => {
      if (cancelled) return;
      setProduct(loaded ?? null);
      setNotFound(!loaded);
    });
    return () => { cancelled = true; };
  }, [loadProduct, params.id]);

  if (loading && !product) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <AdminPageHeader title={tForm('editTitle')} />
        <AdminLoadingState title={t('loading')} />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <AdminPageHeader title={tForm('editTitle')} />
        <AdminErrorState title={t('loadError')} />
      </div>
    );
  }

  return <ProductFormPage key={product.id} mode="edit" product={product} />;
}
