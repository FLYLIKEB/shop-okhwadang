import type { Metadata } from 'next';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import HorizontalScrollGallery from '@/components/blocks/HorizontalScrollGallery';
import { fetchPage, fetchCategories, fetchProducts } from '@/lib/api-server';
import type { Product, Category, PageBlock } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '옥화당 — 공식 쇼핑몰',
  description: '다양한 상품을 만나보세요.',
  openGraph: {
    title: '옥화당 — 공식 쇼핑몰',
    description: '다양한 상품을 만나보세요.',
    type: 'website',
  },
};

async function fetchHomeData(): Promise<{
  featured: Product[];
  popular: Product[];
  categories: Category[];
}> {
  const withTimeout = <T,>(promise: Promise<T>, ms = 5000): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  const [featuredResult, popularResult, categoriesResult] = await Promise.allSettled([
    withTimeout(fetchProducts({ isFeatured: true, limit: 8 })),
    withTimeout(fetchProducts({ sort: 'popular', limit: 8 })),
    withTimeout(fetchCategories()),
  ]);

  return {
    featured: featuredResult.status === 'fulfilled' ? featuredResult.value.items : [],
    popular: popularResult.status === 'fulfilled' ? popularResult.value.items : [],
    categories:
      categoriesResult.status === 'fulfilled'
        ? categoriesResult.value.filter((c) => c.parentId === null)
        : [],
  };
}

/** DB에 홈페이지가 없을 때 사용하는 기본 블록 배열 */
function buildDefaultBlocks(data: {
  featured: Product[];
  popular: Product[];
  categories: Category[];
}): PageBlock[] {
  return [
    {
      id: -1,
      type: 'hero_banner',
      content: { template: 'slider' },
      sort_order: 0,
      is_visible: true,
    },
    {
      id: -2,
      type: 'category_nav',
      content: {
        category_ids: [],
        template: 'text',
        prefetched_categories: data.categories,
      },
      sort_order: 1,
      is_visible: true,
    },
    {
      id: -5,
      type: 'promotion_banner',
      content: {
        title: '차 한 잔의 여유',
        subtitle: '자사호와 보이차가 만드는 고요한 시간',
        cta_text: '더 알아보기',
        cta_url: '/archive',
        template: 'full-width',
      },
      sort_order: 4,
      is_visible: true,
    },
  ];
}

export default async function Home() {
  const [homePage, homeData] = await Promise.all([
    fetchPage('home'),
    fetchHomeData(),
  ]);

  const blocks = homePage?.blocks?.length
    ? homePage.blocks
    : buildDefaultBlocks(homeData);

  const heroBlocks = blocks.filter((b) => b.type === 'hero_banner');
  const restBlocks = blocks.filter((b) => b.type !== 'hero_banner' && b.type !== 'product_grid');
  const hasCustomBlocks = !!(homePage?.blocks?.length);

  return (
    <div>
      {heroBlocks.length > 0 && <BlockRenderer blocks={heroBlocks} />}

      {/* 수평 스크롤 갤러리 — 추천 상품 */}
      {homeData.featured.length > 0 && (
        <HorizontalScrollGallery
          title="추천 상품"
          subtitle="Curated Selection"
          products={homeData.featured}
          moreHref="/products?isFeatured=true"
        />
      )}

      {/* 수평 스크롤 갤러리 — 인기 상품 */}
      {homeData.popular.length > 0 && (
        <HorizontalScrollGallery
          title="인기 상품"
          subtitle="Best Sellers"
          products={homeData.popular}
          moreHref="/products?sort=popular"
        />
      )}

      {restBlocks.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 md:px-16">
          <BlockRenderer blocks={restBlocks} />
        </div>
      )}

      {/* DB 기반 product_grid 블록이 있으면 기존 방식 유지 */}
      {hasCustomBlocks && (
        <div className="mx-auto max-w-7xl px-6 md:px-16">
          <BlockRenderer
            blocks={blocks.filter((b) => b.type === 'product_grid')}
          />
        </div>
      )}
    </div>
  );
}
