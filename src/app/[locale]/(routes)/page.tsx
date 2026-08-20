import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import type {
  CategoryNavContent,
  JournalPreviewContent,
  PageBlock,
  ProductCarouselContent,
  ProductGridContent,
} from '@/lib/api';
import { HOME_PAGE_CONTENT_ERROR_CODE, createHomePageContentError, getHomePageContentErrorDetail } from '@/lib/storefront-diagnostics';
import { fetchCategories, fetchJournals, fetchPage, fetchProducts, fetchProductsBulk } from '@/lib/api-server';
import { isLocale } from '@/i18n/routing';
import { selectCategoriesFromTree } from '@/utils/categoryTree';


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

function HomeCmsIntegrityFallback({
  title,
  description,
  recoveryHint,
  detail,
}: {
  title: string;
  description: string;
  recoveryHint: string;
  detail: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-left shadow-sm">
        <div className="space-y-2">
          <p className="text-base font-semibold text-amber-950">{title}</p>
          <p className="text-sm text-amber-900">{description}</p>
        </div>
        <p className="mt-4 text-sm text-amber-950">{recoveryHint}</p>
        <div className="mt-4 rounded-md bg-background/80 p-3 text-xs text-muted-foreground">
          <p className="break-words">[{HOME_PAGE_CONTENT_ERROR_CODE}] {detail}</p>
        </div>
      </div>
    </div>
  );
}

async function prefetchProductBlock(
  content: ProductGridContent | ProductCarouselContent,
  locale: string,
) {
  if (Array.isArray(content.prefetched_products)) {
    return content.prefetched_products;
  }

  if (Array.isArray(content.product_ids) && content.product_ids.length > 0) {
    return fetchProductsBulk(content.product_ids.slice(0, content.limit), locale);
  }

  const products = await fetchProducts({
    categoryId: content.category_id,
    sort: content.sort,
    limit: content.limit,
    locale,
  });

  return products.items;
}

async function prefetchHomeBlocks(blocks: PageBlock[], locale: string): Promise<PageBlock[]> {
  const productRequests = new Map<string, ReturnType<typeof prefetchProductBlock>>();
  const journalRequests = new Map<string, ReturnType<typeof fetchJournals>>();
  let categoriesRequest: ReturnType<typeof fetchCategories> | undefined;

  return Promise.all(
    blocks.map(async (block) => {
      // Hidden CMS blocks are not rendered and must not trigger catalog or CMS requests.
      if (!block.is_visible) return block;

      try {
        if (block.type === 'product_grid' || block.type === 'product_carousel') {
          const content = block.content as unknown as ProductGridContent | ProductCarouselContent;
          const productKey = JSON.stringify({
            product_ids: content.product_ids?.slice(0, content.limit),
            category_id: content.category_id,
            sort: content.sort,
            limit: content.limit,
            locale,
          });
          let productRequest = productRequests.get(productKey);
          if (!productRequest) {
            productRequest = prefetchProductBlock(content, locale);
            productRequests.set(productKey, productRequest);
          }
          const prefetchedProducts = await productRequest;

          return {
            ...block,
            content: {
              ...content,
              prefetched_products: prefetchedProducts,
            },
          } satisfies PageBlock;
        }

        if (block.type === 'category_nav') {
          const content = block.content as unknown as CategoryNavContent;

          if (Array.isArray(content.prefetched_categories)) {
            return block;
          }

          categoriesRequest ??= fetchCategories(locale);
          const categories = await categoriesRequest;
          const categoryIds = content.category_ids ?? [];
          const prefetchedCategories = selectCategoriesFromTree(categories, categoryIds);

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

          const journalLimit = content.limit ?? 6;
          const journalKey = JSON.stringify({ category: content.category, limit: journalLimit, locale });
          let journalRequest = journalRequests.get(journalKey);
          if (!journalRequest) {
            journalRequest = fetchJournals({
              category: content.category,
              limit: journalLimit,
              locale,
            });
            journalRequests.set(journalKey, journalRequest);
          }
          const prefetchedJournals = await journalRequest;

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
  const [homePage, tUi] = await Promise.all([
    fetchPage('home', locale),
    getTranslations('ui'),
  ]);

  // 홈은 반드시 DB 에서 렌더. 폴백 금지 — 상단 주석 참조.
  if (!homePage?.blocks?.length) {
    if (process.env.NODE_ENV !== 'production') {
      throw createHomePageContentError(locale);
    }

    return (
      <HomeCmsIntegrityFallback
        title={tUi('homeCmsMissingTitle')}
        description={tUi('homeCmsMissingDescription')}
        recoveryHint={tUi('homeCmsMissingRecoveryHint')}
        detail={getHomePageContentErrorDetail(locale)}
      />
    );
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
