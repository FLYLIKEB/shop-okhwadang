'use client';

import { useState } from 'react';
import { Image, Grid3X3, GalleryHorizontalEnd, FolderTree, Megaphone, Type, Info, X, AlignLeft, BookOpen, Palette, Clock3, Images, Contact } from 'lucide-react';
import type { PageBlock } from '@/lib/api';
import { Button } from '@/components/ui/button';

type BlockType = PageBlock['type'];

interface BlockTypeCard {
  type: BlockType;
  label: string;
  description: string;
  detail: string;
  icon: React.ElementType;
}

const BLOCK_TYPES: BlockTypeCard[] = [
  {
    type: 'hero_banner',
    label: '히어로 배너',
    description: '페이지 최상단 대형 배너',
    detail: '페이지 맨 위에 크게 표시되는 이미지 배너입니다.\n제목·부제목·버튼(CTA)·배경 이미지를 설정할 수 있으며, 풀스크린·분할·슬라이더 레이아웃을 선택할 수 있습니다.\n주로 신상품 출시·시즌 이벤트 안내에 사용합니다.',
    icon: Image,
  },
  {
    type: 'product_grid',
    label: '상품 그리드',
    description: '상품을 격자(바둑판) 형태로 나열',
    detail: '지정한 상품들을 2·3·4열 격자로 표시합니다.\n상품 ID를 직접 지정하거나 비워두면 최신 상품을 자동으로 가져옵니다.\n"추천 상품", "신상품" 섹션 등에 사용합니다.',
    icon: Grid3X3,
  },
  {
    type: 'product_carousel',
    label: '상품 캐러셀',
    description: '상품을 좌우 슬라이드로 표시',
    detail: '상품들을 가로로 스크롤하는 슬라이더로 표시합니다.\n한 화면에 여러 상품을 좌우로 넘기며 볼 수 있어 공간 효율이 좋습니다.\n"인기 상품", "최근 본 상품" 등에 사용합니다.',
    icon: GalleryHorizontalEnd,
  },
  {
    type: 'category_nav',
    label: '카테고리 내비',
    description: '카테고리 바로가기 버튼 모음',
    detail: '카테고리 목록을 버튼/아이콘/이미지 스타일로 표시합니다.\n방문자가 원하는 카테고리로 빠르게 이동할 수 있습니다.\n카테고리 ID를 지정하거나 비워두면 전체 카테고리를 보여줍니다.',
    icon: FolderTree,
  },
  {
    type: 'split_content',
    label: '분할 콘텐츠',
    description: '텍스트为中心的 콘텐츠 섹션',
    detail: '서브타이틀, 제목, 설명, CTA 버튼을 설정할 수 있습니다.\n브랜드 소개, 이야기 등에 사용합니다.',
    icon: AlignLeft,
  },
  {
    type: 'promotion_banner',
    label: '프로모션 배너',
    description: '할인·이벤트 안내 띠 배너',
    detail: '할인 이벤트, 기간 한정 프로모션을 강조하는 배너입니다.\n제목·부제목·종료일·버튼(CTA)을 설정할 수 있으며, 전체 너비·카드·타이머 형태를 선택할 수 있습니다.\n히어로 배너보다 작고 콤팩트한 형태입니다.',
    icon: Megaphone,
  },
  {
    type: 'text_content',
    label: '텍스트',
    description: '자유 형식 HTML 텍스트 영역',
    detail: 'HTML 형식으로 자유롭게 텍스트를 작성할 수 있는 블록입니다.\n공지사항, 브랜드 소개, 이용약관 안내 등 다양한 텍스트 콘텐츠에 사용합니다.\n기본·강조 두 가지 스타일을 선택할 수 있습니다.',
    icon: Type,
  },
  {
    type: 'journal_preview',
    label: '저널 미리보기',
    description: '저널 목록을 카드 형태로 표시',
    detail: '최근 저널 글을卡片 형태로 미리볼 수 있는 블록입니다.\n제목, 표시 개수, 카테고리 필터를 설정할 수 있으며, "전체 보기" 링크를 연결할 수 있습니다.\n홈페이지 하단, 저널 섹션 전에 사용합니다.',
    icon: BookOpen,
  },

  {
    type: 'color_card_list',
    label: '색상 카드 리스트',
    description: '색상 카드와 설명 항목',
    detail: '색상 박스와 텍스트로 구성된 카드 리스트입니다. 2열 교차 또는 3열 그리드 레이아웃을 선택할 수 있습니다.',
    icon: Palette,
  },
  {
    type: 'timeline_list',
    label: '타임라인',
    description: '단계별 콘텐츠 목록',
    detail: '제조 과정, 히스토리 등 단계별 콘텐츠를 수직 타임라인으로 표시합니다.',
    icon: Clock3,
  },
  {
    type: 'person_card_list',
    label: '인물 카드',
    description: '인물 소개 카드 목록',
    detail: '인물 사진과 스토리를 교차 레이아웃으로 표시합니다.',
    icon: Contact,
  },
  {
    type: 'image_card_grid',
    label: '이미지 카드 그리드',
    description: '이미지 기반 카드 격자',
    detail: '이미지 카드를 2~4열 그리드로 표시합니다.',
    icon: Images,
  },
];

interface BlockPaletteProps {
  onAddBlock: (type: BlockType, content: Record<string, unknown>) => void;
}

function getDefaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero_banner':
      return { title: '', subtitle: '', image_url: '', cta_text: '', cta_url: '', template: 'fullscreen' };
    case 'product_grid':
      return { product_ids: [], limit: 8, template: '3col', title: '' };
    case 'product_carousel':
      return { product_ids: [], limit: 8, template: 'default', title: '' };
    case 'category_nav':
      return { category_ids: [], template: 'text' };
    case 'promotion_banner':
      return { title: '', subtitle: '', image_url: '', cta_text: '', cta_url: '', template: 'full-width' };
    case 'text_content':
      return { html: '', template: 'default' };
    case 'split_content':
    case 'brand_story':
      return { title: '', subtitle: '', description: '', cta_text: '', cta_url: '', template: 'default' };
    case 'journal_preview':
      return { title: '저널', limit: 6, more_href: '/journal' };
    case 'color_card_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', layout: 'alternating', items: [] };
    case 'timeline_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', items: [] };
    case 'person_card_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', items: [] };
    case 'image_card_grid':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', columns: 3, items: [] };
  }
}

export default function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [tooltip, setTooltip] = useState<BlockType | null>(null);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBlockTypes = normalizedQuery
    ? BLOCK_TYPES.filter(({ label, description, detail, type }) =>
        [label, description, detail, type].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : BLOCK_TYPES;

  return (
    <div className="cms-editor__palette w-64 shrink-0 overflow-y-auto border-r border-soft p-4">
      <h3 className="mb-3 typo-label font-semibold uppercase text-muted-foreground">블록 추가</h3>
      <label className="mb-3 block">
        <span className="sr-only">블록 검색</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="블록 검색"
          className="field-soft w-full rounded-xl border px-3 py-3 typo-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <div className="space-y-1.5">
        {visibleBlockTypes.map(({ type, label, description, detail, icon: Icon }) => (
          <div key={type} className="relative">
            <div className="flex items-stretch gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onAddBlock(type, getDefaultContent(type))}
                className="surface-card flex h-auto min-h-16 flex-1 items-start justify-start gap-2 p-3 text-left transition-colors hover:bg-muted"
                data-testid={`add-block-${type}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="block typo-body-sm font-semibold">{label}</span>
                  <span className="block typo-label leading-tight text-muted-foreground">{description}</span>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTooltip(tooltip === type ? null : type)}
                className="h-auto min-h-16 w-10 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`${label} 설명 보기`}
              >
                {tooltip === type ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {tooltip === type && (
              <div className="mt-2 rounded-xl bg-muted/70 px-3 py-3 typo-body-sm leading-relaxed text-foreground whitespace-pre-line">
                {detail}
              </div>
            )}
          </div>
        ))}
        {visibleBlockTypes.length === 0 && (
          <p className="rounded-xl border border-dashed border-soft p-4 text-center typo-body-sm text-muted-foreground">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

export { BLOCK_TYPES, getDefaultContent };
