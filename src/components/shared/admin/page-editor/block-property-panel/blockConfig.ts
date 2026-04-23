import type { PageBlock } from '@/lib/api';
import type { SelectOption } from './FormFields';

export const BLOCK_TYPE_LABELS: Record<PageBlock['type'], string> = {
  hero_banner: '히어로 배너',
  product_grid: '상품 그리드',
  product_carousel: '상품 캐러셀',
  category_nav: '카테고리 내비',
  promotion_banner: '프로모션 배너',
  text_content: '텍스트',
  split_content: '분할 콘텐츠',
  brand_story: '브랜드 이야기',
  journal_preview: '저널 미리보기',
};

export const BLOCK_TYPE_DESCRIPTIONS: Record<PageBlock['type'], string> = {
  hero_banner:
    '페이지 최상단에 크게 표시되는 배너입니다. 제목·이미지·버튼을 설정하세요. 이미지 URL을 비우면 배경색만 표시됩니다.',
  product_grid:
    '상품을 격자 형태로 나열합니다. 카테고리를 선택하면 해당 카테고리 상품이 표시됩니다. [직접 선택]은 상품을 수동으로 고르고, [자동 불러오기]는 카테고리에서 자동으로 불러옵니다.',
  product_carousel:
    '상품을 좌우 슬라이드로 표시합니다. 카테고리 선택 후 [직접 선택]은 상품을 수동으로 고르고, [자동 불러오기]는 카테고리에서 자동으로 불러옵니다.',
  category_nav:
    '카테고리 바로가기 버튼 모음입니다. 선택한 카테고리가 순서대로 표시됩니다.',
  promotion_banner:
    '할인·이벤트를 강조하는 띠 배너입니다. 종료일을 설정하면 기간이 표시됩니다. 히어로 배너보다 작고 콤팩트합니다.',
  text_content:
    'HTML 형식의 자유 텍스트 영역입니다. 공지사항·브랜드 소개 등에 사용하세요. <b>볼드</b>, <a href="">링크</a> 등 기본 HTML 태그를 사용할 수 있습니다.',
  split_content:
    '텍스트 중심의 콘텐츠 섹션입니다. 서브타이틀, 제목, 설명, CTA 버튼을 설정할 수 있습니다.',
  brand_story:
    '브랜드 이야기 섹션입니다. 서브타이틀, 제목, 설명, CTA 버튼을 설정할 수 있습니다.',
  journal_preview:
    '저널 글을 카드 형태로 미리보기 합니다. 제목, 표시 개수, 전체 보기 링크를 설정할 수 있습니다.',
};

export const PRODUCT_SORT_OPTIONS: SelectOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '판매량순' },
  { value: 'review_count', label: '리뷰 많은순' },
  { value: 'rating', label: '별점순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
];

export const PRODUCT_GRID_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: '2col', label: '2열' },
  { value: '3col', label: '3열' },
  { value: '4col', label: '4열' },
];

export const PRODUCT_CAROUSEL_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: 'default', label: '기본' },
  { value: 'large', label: '대형' },
];

export const HERO_TEMPLATE_OPTIONS: SelectOption[] = [
  {
    value: 'fullscreen',
    label: '풀스크린',
    hint: '이미지가 화면 전체를 꽉 채우는 형태입니다. 제목·버튼이 이미지 위에 겹쳐서 표시됩니다.',
  },
  {
    value: 'slider',
    label: '슬라이더',
    hint: '여러 배너를 좌우로 넘기는 슬라이드 형태입니다. 슬라이드 목록을 아래에서 편집할 수 있습니다.',
  },
  {
    value: 'split',
    label: '분할',
    hint: '화면을 좌우로 나눠 왼쪽에 텍스트·버튼, 오른쪽에 이미지를 배치합니다.',
  },
];

export const CATEGORY_NAV_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: 'icon', label: '아이콘' },
  { value: 'image', label: '이미지' },
  { value: 'text', label: '텍스트' },
];

export const PROMOTION_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: 'full-width', label: '전체 너비' },
  { value: 'card', label: '카드' },
  { value: 'timer', label: '타이머' },
];

export const TEXT_ALIGN_OPTIONS: SelectOption[] = [
  { value: 'left', label: '왼쪽 정렬' },
  { value: 'center', label: '가운데 정렬' },
  { value: 'right', label: '오른쪽 정렬' },
];

export const TEXT_CONTENT_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: 'default', label: '기본' },
  { value: 'highlight', label: '강조' },
];

export const SPLIT_TEMPLATE_OPTIONS: SelectOption[] = [
  { value: 'default', label: '기본' },
  { value: 'large', label: '대형' },
  { value: 'compact', label: '컴팩트' },
];

export const SPLIT_BG_OPTIONS: SelectOption[] = [
  { value: 'white', label: '화이트' },
  { value: 'alternate', label: '따뜻한 회색' },
];

export const PRODUCT_SELECT_MODE_OPTIONS = [
  { value: 'manual', label: '직접 선택' },
  { value: 'auto', label: '자동 불러오기' },
];
