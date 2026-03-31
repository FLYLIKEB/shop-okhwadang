import type { Metadata } from 'next';
import ProductFormPage from '@/components/admin/ProductFormPage';

export const metadata: Metadata = {
  title: '상품 등록 | Admin',
};

export default function AdminProductNewPage() {
  return <ProductFormPage mode="create" />;
}
