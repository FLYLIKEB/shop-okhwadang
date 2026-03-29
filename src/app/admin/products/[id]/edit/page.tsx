'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { productsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import ProductFormPage from '@/components/admin/ProductFormPage';

export default function AdminProductEditPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (isNaN(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    productsApi
      .getById(id)
      .then((p) => setProduct(p))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

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
