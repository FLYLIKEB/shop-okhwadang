'use client';

import { useState } from 'react';
import type { PageBlock, ProductSort } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import EntitySelector from './EntitySelector';
import type { DraftBlock } from './SortableBlockItem';

interface BlockPropertyPanelProps {
  block: DraftBlock | null;
  onUpdateContent: (blockId: number, content: Record<string, unknown>) => void;
}

function StringField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={1}
        className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  const selectedHint = hint ?? options.find((o) => o.value === value)?.hint;
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {selectedHint && (
        <p className="mt-1 text-xs text-muted-foreground">{selectedHint}</p>
      )}
    </div>
  );
}

function RadioField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 typo-label text-muted-foreground">상품 선택 방식</div>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
            className={cn(
              'flex items-center gap-2 typo-label cursor-pointer rounded px-3 py-1.5 transition-colors border',
              value === opt.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 font-medium text-[var(--color-primary)]'
                : 'border-border hover:border-[var(--color-primary)]/50 hover:bg-muted/50',
            )}
          >
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                value === opt.value ? 'border-[var(--color-primary)]' : 'border-muted-foreground',
              )}
            >
              {value === opt.value && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              )}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroBannerFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });

  interface Slide {
    title: string;
    subtitle?: string;
    image_url?: string;
    bg_color?: string;
    cta_text?: string;
    cta_url?: string;
  }

  const slides = (content.slides as Slide[]) ?? [];

  const addSlide = () => {
    update('slides', [
      ...slides,
      { title: '', subtitle: '', image_url: '', bg_color: '#1B3A4B', cta_text: '', cta_url: '' },
    ]);
  };

  const removeSlide = (index: number) => {
    update('slides', slides.filter((_, i) => i !== index));
  };

  const updateSlide = (index: number, key: keyof Slide, value: string) => {
    const newSlides = slides.map((s, i) => (i === index ? { ...s, [key]: value } : s));
    update('slides', newSlides);
  };

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="부제목" value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label="설명 (Markdown 지원)" value={(content.description as string) ?? ''} onChange={(v) => update('description', v)} multiline placeholder="**굵게**, *기울임*, **11** → 11 볼드 등 Markdown 포맷 사용 가능" />
      <StringField label="이미지 URL" value={(content.image_url as string) ?? ''} onChange={(v) => update('image_url', v)} placeholder="https://..." />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'fullscreen'}
        options={[
          { value: 'fullscreen', label: '풀스크린', hint: '이미지가 화면 전체를 꽉 채우는 형태입니다. 제목·버튼이 이미지 위에 겹쳐서 표시됩니다.' },
          { value: 'slider', label: '슬라이더', hint: '여러 배너를 좌우로 넘기는 슬라이드 형태입니다. 슬라이드 목록을 아래에서 편집할 수 있습니다.' },
          { value: 'split', label: '분할', hint: '화면을 좌우로 나눠 왼쪽에 텍스트·버튼, 오른쪽에 이미지를 배치합니다.' },
        ]}
        onChange={(v) => update('template', v)}
      />
      {(content.template as string) === 'slider' && (
        <div className="space-y-3 rounded-md border border-input p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">슬라이드 목록</label>
            <button
              type="button"
              onClick={addSlide}
              className="text-xs text-primary hover:underline"
            >
              + 슬라이드 추가
            </button>
          </div>
          {slides.length === 0 && (
            <p className="text-xs text-muted-foreground">슬라이드가 없습니다. 추가 버튼을 눌러 추가하세요.</p>
          )}
          {slides.map((slide, index) => (
            <div key={index} className="space-y-2 rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">슬라이드 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  삭제
                </button>
              </div>
              <StringField label="제목" value={slide.title} onChange={(v) => updateSlide(index, 'title', v)} />
              <StringField label="부제목" value={slide.subtitle ?? ''} onChange={(v) => updateSlide(index, 'subtitle', v)} />
              <StringField label="이미지 URL" value={slide.image_url ?? ''} onChange={(v) => updateSlide(index, 'image_url', v)} />
              <StringField label="배경색" value={slide.bg_color ?? '#1B3A4B'} onChange={(v) => updateSlide(index, 'bg_color', v)} />
              <StringField label="CTA 텍스트" value={slide.cta_text ?? ''} onChange={(v) => updateSlide(index, 'cta_text', v)} />
              <StringField label="CTA URL" value={slide.cta_url ?? ''} onChange={(v) => updateSlide(index, 'cta_url', v)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ProductGridFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  const productIds = (content.product_ids as number[]) ?? [];
  const selectedCategoryId = content.category_id as number | undefined;
  const isAuto = content.auto === true;
  const hasCategory = selectedCategoryId !== undefined;

  function handleCategoryChange(ids: number[]) {
    const catId = ids[0] ?? undefined;
    const updates: Record<string, unknown> = { ...content, category_id: catId };
    if (catId === undefined) {
      updates.auto = undefined;
    }
    onChange(updates);
  }

  function handleAutoChange(val: string) {
    const newAuto = val === 'auto';
    const updates: Record<string, unknown> = { ...content, auto: newAuto };
    if (newAuto) {
      updates.product_ids = [];
    }
    onChange(updates);
  }

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <NumberField label="표시 개수" value={(content.limit as number) ?? 8} onChange={(v) => update('limit', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? '3col'}
        options={[
          { value: '2col', label: '2열' },
          { value: '3col', label: '3열' },
          { value: '4col', label: '4열' },
        ]}
        onChange={(v) => update('template', v)}
      />
      <EntitySelector
        type="category"
        selectedIds={selectedCategoryId ? [selectedCategoryId] : []}
        onChange={handleCategoryChange}
        placeholder="카테고리 선택..."
      />
      {hasCategory && (
        <RadioField
          value={isAuto ? 'auto' : 'manual'}
          options={[
            { value: 'manual', label: '직접 선택' },
            { value: 'auto', label: '자동 불러오기' },
          ]}
          onChange={handleAutoChange}
        />
      )}
      {(!hasCategory || !isAuto) && (
        <EntitySelector
          type="product"
          selectedIds={productIds}
          onChange={(ids) => update('product_ids', ids)}
          placeholder={hasCategory ? '해당 카테고리 상품 검색...' : '상품 검색...'}
          categoryId={hasCategory ? selectedCategoryId : undefined}
        />
      )}
    </>
  );
}

function ProductCarouselFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  const productIds = (content.product_ids as number[]) ?? [];
  const selectedCategoryId = content.category_id as number | undefined;
  const isAuto = content.auto === true;
  const hasCategory = selectedCategoryId !== undefined;

  function handleCategoryChange(ids: number[]) {
    const catId = ids[0] ?? undefined;
    const updates: Record<string, unknown> = { ...content, category_id: catId };
    if (catId === undefined) {
      updates.auto = undefined;
    }
    onChange(updates);
  }

  function handleAutoChange(val: string) {
    const newAuto = val === 'auto';
    const updates: Record<string, unknown> = { ...content, auto: newAuto };
    if (newAuto) {
      updates.product_ids = [];
    }
    onChange(updates);
  }

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <NumberField label="표시 개수" value={(content.limit as number) ?? 8} onChange={(v) => update('limit', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'default'}
        options={[
          { value: 'default', label: '기본' },
          { value: 'large', label: '대형' },
        ]}
        onChange={(v) => update('template', v)}
      />
      <SelectField
        label="정렬"
        value={(content.sort as string) ?? 'latest'}
        options={[
          { value: 'latest', label: '최신순' },
          { value: 'popular', label: '판매량순' },
          { value: 'review_count', label: '리뷰 많은순' },
          { value: 'rating', label: '별점순' },
          { value: 'price_asc', label: '가격 낮은순' },
          { value: 'price_desc', label: '가격 높은순' },
        ]}
        onChange={(v) => update('sort', v as ProductSort)}
      />
      <EntitySelector
        type="category"
        selectedIds={selectedCategoryId ? [selectedCategoryId] : []}
        onChange={handleCategoryChange}
        placeholder="카테고리 선택..."
      />
      {hasCategory && (
        <RadioField
          value={isAuto ? 'auto' : 'manual'}
          options={[
            { value: 'manual', label: '직접 선택' },
            { value: 'auto', label: '자동 불러오기' },
          ]}
          onChange={handleAutoChange}
        />
      )}
      {(!hasCategory || !isAuto) && (
        <EntitySelector
          type="product"
          selectedIds={productIds}
          onChange={(ids) => update('product_ids', ids)}
          placeholder={hasCategory ? '해당 카테고리 상품 검색...' : '상품 검색...'}
          categoryId={hasCategory ? selectedCategoryId : undefined}
        />
      )}
    </>
  );
}

function CategoryNavFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  const categoryIds = (content.category_ids as number[]) ?? [];
  return (
    <>
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'text'}
        options={[
          { value: 'icon', label: '아이콘' },
          { value: 'image', label: '이미지' },
          { value: 'text', label: '텍스트' },
        ]}
        onChange={(v) => update('template', v)}
      />
      <EntitySelector
        type="category"
        selectedIds={categoryIds}
        onChange={(ids) => update('category_ids', ids)}
        placeholder="카테고리 검색..."
      />
    </>
  );
}

function PromotionBannerFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="부제목" value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label="이미지 URL" value={(content.image_url as string) ?? ''} onChange={(v) => update('image_url', v)} />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <StringField label="종료일" value={(content.expires_at as string) ?? ''} onChange={(v) => update('expires_at', v)} placeholder="YYYY-MM-DD" />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'full-width'}
        options={[
          { value: 'full-width', label: '전체 너비' },
          { value: 'card', label: '카드' },
          { value: 'timer', label: '타이머' },
        ]}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}

function TextContentFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  return (
    <>
      <SelectField
        label="텍스트 정렬"
        value={(content.textAlign as string) ?? 'center'}
        options={[
          { value: 'left', label: '왼쪽 정렬' },
          { value: 'center', label: '가운데 정렬' },
          { value: 'right', label: '오른쪽 정렬' },
        ]}
        onChange={(v) => update('textAlign', v)}
      />
      <StringField label="HTML 내용" value={(content.html as string) ?? ''} onChange={(v) => update('html', v)} multiline />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'default'}
        options={[
          { value: 'default', label: '기본' },
          { value: 'highlight', label: '강조' },
        ]}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}

const BLOCK_TYPE_LABELS: Record<PageBlock['type'], string> = {
  hero_banner: '히어로 배너',
  product_grid: '상품 그리드',
  product_carousel: '상품 캐러셀',
  category_nav: '카테고리 내비',
  promotion_banner: '프로모션 배너',
  text_content: '텍스트',
  split_content: '분할 콘텐츠',
  brand_story: '브랜드 이야기',
};

const BLOCK_TYPE_DESCRIPTIONS: Record<PageBlock['type'], string> = {
  hero_banner: 'ℹ️ 페이지 최상단에 크게 표시되는 배너입니다. 제목·이미지·버튼을 설정하세요. 이미지 URL을 비우면 배경색만 표시됩니다.',
  product_grid: 'ℹ️ 상품을 격자(바둑판) 형태로 나열합니다. 카테고리를 선택하면 해당 카테고리 상품이 표시됩니다. [직접 선택]模式下可自由挑选商品，[자동 불러오기]模式下则自动从该分类获取商品。',
  product_carousel: 'ℹ️ 상품을 좌우 슬라이드로 표시합니다. 카테고리 선택 후 [직접 선택]模式下可自由挑选商品，[자동 불러오기]模式下则自动从该分类获取商品。',
  category_nav: 'ℹ️ 카테고리 바로가기 버튼 모음입니다. 카테고리를 선택하면 순서대로 표시됩니다.',
  promotion_banner: 'ℹ️ 할인·이벤트를 강조하는 띠 배너입니다. 종료일을 설정하면 기간 표시가 가능합니다. 히어로 배너보다 작고 콤팩트합니다.',
  text_content: 'ℹ️ HTML 형식의 자유 텍스트 영역입니다. 공지사항·브랜드 소개 등에 사용하세요. <b>볼드</b>, <a href="">링크</a> 등 기본 HTML 태그 사용 가능합니다.',
  split_content: 'ℹ️ 이미지와 텍스트를 2열로 나란히 표시합니다. 이미지 위치(좌/우), 제목·설명·버튼을 설정할 수 있습니다.',
  brand_story: 'ℹ️ 브랜드 이야기 섹션입니다. 장인 이미지와 브랜드 소개 텍스트를 2열 레이아웃으로 표시합니다.',
};

export default function BlockPropertyPanel({ block, onUpdateContent }: BlockPropertyPanelProps) {
  if (!block) {
    return (
      <div className="flex w-72 shrink-0 items-center justify-center border-l p-4 text-sm text-muted-foreground">
        블록을 선택하면 설정을 편집할 수 있습니다
      </div>
    );
  }

  const handleChange = (content: Record<string, unknown>) => {
    onUpdateContent(block.id, content);
  };

  const renderFields = () => {
    switch (block.type) {
      case 'hero_banner':
        return <HeroBannerFields content={block.content} onChange={handleChange} />;
      case 'product_grid':
        return <ProductGridFields content={block.content} onChange={handleChange} />;
      case 'product_carousel':
        return <ProductCarouselFields content={block.content} onChange={handleChange} />;
      case 'category_nav':
        return <CategoryNavFields content={block.content} onChange={handleChange} />;
      case 'promotion_banner':
        return <PromotionBannerFields content={block.content} onChange={handleChange} />;
      case 'text_content':
        return <TextContentFields content={block.content} onChange={handleChange} />;
    }
  };

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l p-4">
      <h3 className="mb-2 text-sm font-semibold">
        {BLOCK_TYPE_LABELS[block.type]} 설정
      </h3>
      <p className="mb-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        {BLOCK_TYPE_DESCRIPTIONS[block.type]}
      </p>
      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        ✏️ 수정 내용은 상단 <b>저장</b> 버튼을 눌러야 반영됩니다
      </div>
      <div className="space-y-3">
        {renderFields()}
      </div>
    </div>
  );
}
