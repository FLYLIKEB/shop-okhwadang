import type { Metadata } from 'next';
import ProductFormPage from '@/components/shared/admin/ProductFormPage';

export const metadata: Metadata = {
  title: '상품 등록 | Admin',
};

export default function AdminProductNewPage() {
  return <ProductFormPage mode="create" />;
}
