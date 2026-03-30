import type { Metadata } from 'next';
import HeroBannerSlider from '@/components/home/HeroBannerSlider';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategoryNav from '@/components/home/CategoryNav';
import PromotionBanner from '@/components/home/PromotionBanner';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { homeApi, categoriesApi } from '@/lib/api';
import { fetchPage } from '@/lib/api-server';
import type { Product, Category } from '@/lib/api';

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
    withTimeout(homeApi.getFeaturedProducts()),
    withTimeout(homeApi.getPopularProducts()),
    withTimeout(categoriesApi.getTree()),
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

async function fetchHomePage() {
  const page = await fetchPage('home');
  if (page && page.blocks && page.blocks.length > 0) return page;
  return null;
}

export default async function Home() {
  const [homePage, homeData] = await Promise.all([
    fetchHomePage(),
    fetchHomeData(),
  ]);

  if (homePage) {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <BlockRenderer blocks={homePage.blocks} />
      </div>
    );
  }

  const { featured, popular, categories } = homeData;

  return (
    <div className="mx-auto max-w-7xl px-4">
      <HeroBannerSlider />

      <CategoryNav categories={categories} />

      <FeaturedProducts
        title="추천 상품"
        products={featured}
        moreHref="/products?isFeatured=true"
      />

      <FeaturedProducts
        title="인기 상품"
        products={popular}
        moreHref="/products?sort=popular"
      />

      <PromotionBanner />
    </div>
  );
}
