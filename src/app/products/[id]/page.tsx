import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchProduct } from '@/lib/api-server'
import ProductDetailClient from '@/components/products/ProductDetailClient'

const SITE_URL = process.env.SITE_URL ?? 'https://shop-okhwadang.com';

interface ProductDetailProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) return { title: '상품을 찾을 수 없습니다' }

  const imageUrl = product.images?.[0]?.url ?? '';
  const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${SITE_URL}${imageUrl}`;
  const description = product.shortDescription ?? product.description?.slice(0, 160) ?? `${product.name} 상세 페이지`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: imageUrl ? [{ url: absoluteImageUrl, width: 1200, height: 630, alt: product.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: imageUrl ? [absoluteImageUrl] : [],
    },
    alternates: {
      canonical: `/products/${id}`,
    },
  }
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.map(img => img.url) ?? [],
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: product.salePrice ?? product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: '옥화당' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductDetailClient product={product} />
    </>
  )
}
