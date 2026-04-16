import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchPage, fetchCategories, fetchProducts } from '@/lib/api-server';
import type { Product, Category, PageBlock } from '@/lib/api';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');
  const title = t('metaTitle');
  const description = t('metaDescription');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

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

interface DefaultBlockCopy {
  featuredProducts: string;
  popularProducts: string;
  promoTitle: string;
  promoSubtitle: string;
  promoCta: string;
}

/** DB에 홈페이지가 없을 때 사용하는 기본 블록 배열 */
function buildDefaultBlocks(
  data: {
    featured: Product[];
    popular: Product[];
    categories: Category[];
  },
  copy: DefaultBlockCopy,
): PageBlock[] {
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
      id: -3,
      type: 'product_grid',
      content: {
        title: copy.featuredProducts,
        template: '4col',
        limit: 8,
        more_href: '/products?isFeatured=true',
        prefetched_products: data.featured,
      },
      sort_order: 2,
      is_visible: true,
    },
    {
      id: -4,
      type: 'product_grid',
      content: {
        title: copy.popularProducts,
        template: '4col',
        limit: 8,
        more_href: '/products?sort=popular',
        prefetched_products: data.popular,
      },
      sort_order: 3,
      is_visible: true,
    },
    {
      id: -5,
      type: 'promotion_banner',
      content: {
        title: copy.promoTitle,
        subtitle: copy.promoSubtitle,
        cta_text: copy.promoCta,
        cta_url: '/products',
        template: 'full-width',
      },
      sort_order: 4,
      is_visible: true,
    },
  ];
}

export default async function Home() {
  const [homePage, homeData, t] = await Promise.all([
    fetchPage('home'),
    fetchHomeData(),
    getTranslations('home'),
  ]);

  const blocks = homePage?.blocks?.length
    ? homePage.blocks
    : buildDefaultBlocks(homeData, {
        featuredProducts: t('featuredProducts'),
        popularProducts: t('popularProducts'),
        promoTitle: t('promoTitle'),
        promoSubtitle: t('promoSubtitle'),
        promoCta: t('promoCta'),
      });

  const heroBlocks = blocks.filter((b) => b.type === 'hero_banner');
  const restBlocks = blocks.filter((b) => b.type !== 'hero_banner');

  return (
    <div>
      {heroBlocks.length > 0 && <BlockRenderer blocks={heroBlocks} />}
      <div className="mx-auto max-w-7xl px-4 mt-8">
        <BlockRenderer blocks={restBlocks} />
      </div>
    </div>
  );
}
