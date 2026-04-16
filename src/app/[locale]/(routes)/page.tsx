import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlockRenderer from '@/components/shared/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';

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

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const homePage = await fetchPage('home', locale);

  // 홈은 반드시 DB 에서 렌더. 폴백 금지 — 상단 주석 참조.
  if (!homePage?.blocks?.length) {
    throw new Error(
      `[home] DB 에 slug='home' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). ` +
        `시드 데이터를 확인하세요: scripts/run-seed.sh`,
    );
  }

  const blocks = homePage.blocks;
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
