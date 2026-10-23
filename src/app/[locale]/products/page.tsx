import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ProductsCatalog, { type ProductsCatalogProps } from '@/components/shared/products/ProductsCatalog';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'product' });
  return {
    title: `${t('productList')} | Ockhwadang`,
    description: t('productList'),
  };
}

export default function ProductsPage(props: Omit<ProductsCatalogProps, 'isPreOrder'>) {
  return <ProductsCatalog {...props} />;
}
