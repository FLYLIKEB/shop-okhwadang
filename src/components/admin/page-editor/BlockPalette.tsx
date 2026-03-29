'use client';

import { useState } from 'react';
import { Image, Grid3X3, GalleryHorizontalEnd, FolderTree, Megaphone, Type, Info, X } from 'lucide-react';
import type { PageBlock } from '@/lib/api';

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
  }
}

export default function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [tooltip, setTooltip] = useState<BlockType | null>(null);

  return (
    <div className="w-52 shrink-0 overflow-y-auto border-r p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">블록 추가</h3>
      <div className="space-y-1.5">
        {BLOCK_TYPES.map(({ type, label, description, detail, icon: Icon }) => (
          <div key={type} className="relative">
            <div className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => onAddBlock(type, getDefaultContent(type))}
                className="flex flex-1 items-start gap-2 rounded-md border p-2.5 text-left transition-colors hover:bg-muted"
                data-testid={`add-block-${type}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground leading-tight">{description}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTooltip(tooltip === type ? null : type)}
                className="shrink-0 rounded-md border px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`${label} 설명 보기`}
              >
                {tooltip === type ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </button>
            </div>

            {tooltip === type && (
              <div className="mt-1 rounded-md border bg-muted/60 px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-line">
                {detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { BLOCK_TYPES, getDefaultContent };
