import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchProduct, fetchCollections } from '@/lib/api-server'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site-url'

interface ProductDetailProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { id, locale } = await params
  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;
  const product = await fetchProduct(Number(id), safeLocale)
  if (!product) return { title: '상품을 찾을 수 없습니다' }

  const imageUrl = product.images?.[0]?.url ?? '';
  const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${SITE_URL}${imageUrl}`;
  const description = product.shortDescription ?? product.description?.slice(0, 160) ?? `${product.name} 상세 페이지`;

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${SITE_URL}/${loc}/products/${id}`;
  }
  languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}/products/${id}`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: imageUrl ? [{ url: absoluteImageUrl, width: 1200, height: 630, alt: product.name }] : [],
      type: 'website',
      locale: safeLocale,
      alternateLocale: routing.locales.filter((loc) => loc !== safeLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: imageUrl ? [absoluteImageUrl] : [],
    },
    alternates: {
      canonical: `${SITE_URL}/${safeLocale}/products/${id}`,
      languages,
    },
  }
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { id, locale } = await params
  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale
  const [product, collections] = await Promise.all([
    fetchProduct(Number(id), safeLocale),
    fetchCollections().catch(() => null),
  ])
  if (!product) notFound()

  const clayCollections = collections?.clay ?? []
  const shapeCollections = collections?.shape ?? []

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

  const jsonLdString = JSON.stringify(jsonLd)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <>
      {/* JSON-LD structured data — server-generated, safe */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />
      <ProductDetailClient product={product} locale={safeLocale} clayCollections={clayCollections} shapeCollections={shapeCollections} />
    </>
  )
}
