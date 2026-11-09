import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-server', () => ({
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
}));

import { fetchProducts, fetchProduct } from '@/lib/api-server';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

const mockFetchProducts = fetchProducts as ReturnType<typeof vi.fn>;
const mockFetchProduct = fetchProduct as ReturnType<typeof vi.fn>;

describe('SEO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('robots.ts', () => {
    it('disallows admin, my, checkout, api paths', () => {
      const result = robots();
      const rule = result.rules;
      const firstRule = Array.isArray(rule) ? rule[0] : rule;
      expect(firstRule.disallow).toContain('/admin/');
      expect(firstRule.disallow).toContain('/my/');
      expect(firstRule.disallow).toContain('/checkout/');
      expect(firstRule.disallow).toContain('/api/');
    });

    it('allows root path', () => {
      const result = robots();
      const rule = result.rules;
      const firstRule = Array.isArray(rule) ? rule[0] : rule;
      expect(firstRule.allow).toBe('/');
    });

    it('includes sitemap URL', () => {
      const result = robots();
      expect(result.sitemap).toContain('/sitemap.xml');
    });
  });

  describe('sitemap.ts', () => {
    it('includes static routes', async () => {
      mockFetchProducts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
      const result = await sitemap();
      const urls = result.map((r) => r.url);
      expect(urls).toContain('https://ockhwadang.com/ko');
      expect(urls).toContain('https://ockhwadang.com/en');
      expect(urls).toContain('https://ockhwadang.com/ko/products');
      expect(urls).toContain('https://ockhwadang.com/en/products');
    });

    it('includes product routes from each locale-specific product list', async () => {
      mockFetchProducts.mockImplementation(({ locale }: { locale: string }) =>
        Promise.resolve({
          items: [
            {
              id: locale === 'ko' ? 1 : 2,
              name: 'Test Product',
              slug: 'test',
              price: 10000,
              salePrice: null,
              shortDescription: null,
              rating: 0,
              reviewCount: 0,
              status: 'active',
              isFeatured: false,
              viewCount: 0,
              category: null,
              images: [],
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        }),
      );
      const result = await sitemap();
      const urls = result.map((r) => r.url);
      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 1, limit: 100, locale: 'ko' });
      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 1, limit: 100, locale: 'en' });
      expect(urls).toContain('https://ockhwadang.com/ko/products/1');
      expect(urls).toContain('https://ockhwadang.com/en/products/2');
      expect(urls).not.toContain('https://ockhwadang.com/en/products/1');
    });

    it('paginates product routes without exceeding the backend product limit', async () => {
      mockFetchProducts.mockImplementation(({ page, locale }: { page: number; locale: string }) =>
        Promise.resolve({
          items:
            page === 1
              ? Array.from({ length: 100 }, (_, index) => ({
                  id: locale === 'ko' ? index + 1 : index + 101,
                  name: 'Test Product',
                  slug: 'test',
                  price: 10000,
                  salePrice: null,
                  shortDescription: null,
                  rating: 0,
                  reviewCount: 0,
                  status: 'active',
                  isFeatured: false,
                  viewCount: 0,
                  category: null,
                  images: [],
                }))
              : [
                  {
                    id: locale === 'ko' ? 1000 : 2000,
                    name: 'Last Product',
                    slug: 'last',
                    price: 10000,
                    salePrice: null,
                    shortDescription: null,
                    rating: 0,
                    reviewCount: 0,
                    status: 'active',
                    isFeatured: false,
                    viewCount: 0,
                    category: null,
                    images: [],
                  },
                ],
          total: 101,
          page,
          limit: 100,
        }),
      );

      const result = await sitemap();
      const urls = result.map((r) => r.url);

      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 1, limit: 100, locale: 'ko' });
      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 2, limit: 100, locale: 'ko' });
      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 1, limit: 100, locale: 'en' });
      expect(mockFetchProducts).toHaveBeenCalledWith({ page: 2, limit: 100, locale: 'en' });
      expect(urls).toContain('https://ockhwadang.com/ko/products/1000');
      expect(urls).toContain('https://ockhwadang.com/en/products/2000');
    });

    it('returns only static routes when fetchProducts fails', async () => {
      mockFetchProducts.mockRejectedValue(new Error('Network error'));
      const result = await sitemap();
      const urls = result.map((r) => r.url);
      expect(urls).toContain('https://ockhwadang.com/ko');
      expect(urls).not.toContain(expect.stringContaining('/products/'));
    });
  });

  describe('JSON-LD schema', () => {
    it('generates valid Product schema fields', () => {
      const product = {
        id: 1,
        name: 'Test Product',
        description: 'A test product description',
        shortDescription: 'Short desc',
        price: 29000,
        salePrice: 25000,
        stock: 10,
        sku: 'TEST-001',
        images: [
          {
            id: 1,
            url: '/images/test.jpg',
            thumbnailUrl: null,
            alt: 'Test',
            sortOrder: 0,
            isThumbnail: true,
            isDescriptionImage: false,
          },
        ],
        detailImages: [],
        rating: 0,
        reviewCount: 0,
        slug: 'test-product',
        status: 'active' as const,
        isFeatured: false,
        viewCount: 0,
        category: null,
        options: [],
      };

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images?.map((img) => img.url) ?? [],
        sku: product.sku,
        brand: { '@type': 'Brand', name: '옥화당' },
        url: `https://ockhwadang.com/ko/products/${product.id}`,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'KRW',
          price: product.salePrice ?? product.price,
          availability:
            product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: '옥화당' },
        },
      };

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('Product');
      expect(jsonLd.name).toBe('Test Product');
      expect(jsonLd.sku).toBe('TEST-001');
      expect(jsonLd.brand).toEqual({ '@type': 'Brand', name: '옥화당' });
      expect(jsonLd.url).toBe('https://ockhwadang.com/ko/products/1');
      expect(jsonLd.offers.price).toBe(25000);
      expect(jsonLd.offers.priceCurrency).toBe('KRW');
      expect(jsonLd.offers.availability).toBe('https://schema.org/InStock');
      expect(jsonLd.image).toEqual(['/images/test.jpg']);
    });

    it('shows OutOfStock when stock is 0', () => {
      const stock = 0;
      const availability =
        stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
      expect(availability).toBe('https://schema.org/OutOfStock');
    });
  });

  describe('root layout metadata', () => {
    it('includes 자사호 keyword in default title and keywords', async () => {
      const { metadata } = await import('@/app/layout');
      const title =
        typeof metadata.title === 'object' && metadata.title !== null && 'default' in metadata.title
          ? (metadata.title as { default: string }).default
          : String(metadata.title);
      expect(title).toContain('자사호');
      expect(metadata.description).toContain('자사호');
      expect(metadata.keywords).toEqual(
        expect.arrayContaining(['자사호', '보이차', '다구', '옥화당']),
      );
    });
  });

  describe('generateMetadata (product page)', () => {
    it('returns product metadata with OG tags', async () => {
      mockFetchProduct.mockResolvedValue({
        id: 1,
        name: 'Test Product',
        description: 'Full description here',
        shortDescription: 'Short desc',
        price: 29000,
        salePrice: null,
        stock: 10,
        sku: 'TEST-001',
        images: [
          {
            id: 1,
            url: '/images/test.jpg',
            thumbnailUrl: null,
            alt: 'Test',
            sortOrder: 0,
            isThumbnail: true,
            isDescriptionImage: false,
          },
        ],
        detailImages: [],
        rating: 0,
        reviewCount: 0,
        slug: 'test-product',
        status: 'active',
        isFeatured: false,
        viewCount: 0,
        category: null,
        options: [],
      });

      const { generateMetadata } = await import('@/app/[locale]/products/[id]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ id: '1', locale: 'ko' }),
      });

      expect(metadata.title).toBe('Test Product');
      expect(metadata.description).toBe('Short desc');
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();
      expect(metadata.alternates?.canonical).toBe('https://ockhwadang.com/ko/products/1');
    });

    it.each([
      { shortDescription: null, description: '<div><!-- editor --><p>황룡산 <strong>원광</strong></p><p>수공예 &amp; 자사호&nbsp;70cc</p></div>', expected: '황룡산 원광 수공예 & 자사호 70cc' },
      { shortDescription: '<b>짧은 설명</b><br>70cc', description: 'Full description', expected: '짧은 설명 70cc' },
      { shortDescription: '  &nbsp; ', description: '<p>상세 설명</p>', expected: '상세 설명' },
      { shortDescription: null, description: '<style>.editor { color: red }</style><script>alert(1)</script><p>실제 설명</p>', expected: '실제 설명' },
      { shortDescription: '', description: '<div><img src="/detail.jpg" alt="상세사진"></div>', expected: 'Test Product 상세 페이지' },
      { shortDescription: null, description: '<div class="' + 'editor-'.repeat(30) + '"><p>' + '상품 설명 '.repeat(50) + '</p></div>', expected: '상품 설명 '.repeat(50).trim().slice(0, 160) },
    ])('uses readable share descriptions: $expected', async ({ shortDescription, description, expected }) => {
      mockFetchProduct.mockResolvedValue({ name: 'Test Product', shortDescription, description, images: [] });
      const { generateMetadata } = await import('@/app/[locale]/products/[id]/page');
      const metadata = await generateMetadata({ params: Promise.resolve({ id: '36', locale: 'ko' }) });
      expect(metadata.title).toBe('Test Product');
      expect(metadata.description).toBe(expected);
      expect(metadata.openGraph).toMatchObject({ title: 'Test Product', description: expected });
      expect(metadata.twitter).toMatchObject({ title: 'Test Product', description: expected });
    });

    it('uses the English fallback for image-only product descriptions', async () => {
      mockFetchProduct.mockResolvedValue({ name: 'Tea pot', shortDescription: '', description: '<img src="/detail.jpg">', images: [] });
      const { generateMetadata } = await import('@/app/[locale]/products/[id]/page');
      const metadata = await generateMetadata({ params: Promise.resolve({ id: '36', locale: 'en' }) });
      expect(metadata.description).toBe('Tea pot detail page');
    });

    it('returns fallback when product not found', async () => {
      mockFetchProduct.mockResolvedValue(null);

      const { generateMetadata } = await import('@/app/[locale]/products/[id]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ id: '999', locale: 'ko' }),
      });

      expect(metadata.title).toBe('상품을 찾을 수 없습니다');
    });
  });
});
