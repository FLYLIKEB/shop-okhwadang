import { localMessage } from '@/utils/localMessages';
import type { Metadata } from 'next';
import ProductFormPage from '@/components/shared/admin/ProductFormPage';

export const metadata: Metadata = {
  title: localMessage('adminEnglish.addProductAdmin'),
};

export default function AdminProductNewPage() {
  return <ProductFormPage mode="create" />;
}
