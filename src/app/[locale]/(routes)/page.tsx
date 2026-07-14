import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import type { CategoryNavContent, JournalPreviewContent, PageBlock, ProductGridContent } from '@/lib/api';
import { createHomePageContentError } from '@/lib/storefront-diagnostics';
import { fetchCategories, fetchJournals, fetchPage, fetchProducts } from '@/lib/api-server';
import { isLocale } from '@/i18n/routing';


/**
 * 홈페이지 렌더링 규칙 (필수)
 * ─────────────────────────────────────────────────────────────
 * 홈 페이지는 **반드시** DB 의 `pages` 테이블 (slug='home') 에 저장된
 * 블록 데이터로 렌더링되어야 한다. 하드코딩 기본값/폴백 블록을 두지 않는다.
 *
 * 이유:
 * - 운영팀이 CMS 에서 홈을 자유롭게 편집할 수 있어야 함.
 * - 프론트 코드 폴백이 있으면 DB 수정이 안 보여서 혼란 발생.
 * - i18n 기본 슬라이드 같은 하드코딩은 로케일 추가 시마다 코드 수정 필요.
 *
 * DB 에서 home 페이지 로드 실패 시:
 * - 개발 환경: error.tsx 로 명시적 에러 노출 (여기서 throw)
 * - 시드 필요: `scripts/run-seed.sh` 또는 `/db-seed` skill 사용
 * ─────────────────────────────────────────────────────────────
 */

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

async function prefetchHomeBlocks(blocks: PageBlock[], locale: string): Promise<PageBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      try {
        if (block.type === 'product_grid') {
          const content = block.content as unknown as ProductGridContent;

          if (Array.isArray(content.prefetched_products) || Array.isArray(content.product_ids)) {
            return block;
          }

          const products = await fetchProducts({
            categoryId: content.category_id,
            sort: content.sort,
            limit: content.limit,
            locale,
          });

          return {
            ...block,
            content: {
              ...content,
              prefetched_products: products.items,
            },
          } satisfies PageBlock;
        }

        if (block.type === 'category_nav') {
          const content = block.content as unknown as CategoryNavContent;

          if (Array.isArray(content.prefetched_categories)) {
            return block;
          }

          const categories = await fetchCategories(locale);
          const categoryIds = content.category_ids ?? [];
          const prefetchedCategories = categoryIds.length > 0
            ? categories.filter((category) => categoryIds.includes(category.id))
            : categories.filter((category) => category.parentId === null);

          return {
            ...block,
            content: {
              ...content,
              prefetched_categories: prefetchedCategories,
            },
          } satisfies PageBlock;
        }

        if (block.type === 'journal_preview') {
          const content = block.content as unknown as JournalPreviewContent;

          if (Array.isArray(content.prefetched_journals)) {
            return block;
          }

          const prefetchedJournals = await fetchJournals({
            category: content.category,
            limit: content.limit ?? 6,
            locale,
          });

          return {
            ...block,
            content: {
              ...content,
              prefetched_journals: prefetchedJournals,
            },
          } satisfies PageBlock;
        }

        return block;
      } catch {
        return block;
      }
    }),
  );
}


export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const homePage = await fetchPage('home', locale);

  // 홈은 반드시 DB 에서 렌더. 폴백 금지 — 상단 주석 참조.
  if (!homePage?.blocks?.length) {
    throw createHomePageContentError(locale);
  }

  const blocks = await prefetchHomeBlocks(homePage.blocks, locale);
  const heroBlocks = blocks.filter((b) => b.type === 'hero_banner');
  const restBlocks = blocks.filter((b) => b.type !== 'hero_banner');

  return (
    <div>
      {heroBlocks.length > 0 && <BlockRenderer blocks={heroBlocks} />}
      <div className="layout-container layout-section">
        <BlockRenderer blocks={restBlocks} />
      </div>
    </div>
  );
}
