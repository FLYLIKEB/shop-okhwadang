'use client';

import type { PageBlock } from '@/lib/api';
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

function HeroBannerFields({
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
      <StringField label="이미지 URL" value={(content.image_url as string) ?? ''} onChange={(v) => update('image_url', v)} placeholder="https://..." />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'fullscreen'}
        options={[
          { value: 'fullscreen', label: '풀스크린', hint: '이미지가 화면 전체를 꽉 채우는 형태입니다. 제목·버튼이 이미지 위에 겹쳐서 표시됩니다.' },
          { value: 'slider', label: '슬라이더', hint: '여러 배너를 좌우로 넘기는 슬라이드 형태입니다. 이미지 URL을 콤마로 구분해 여러 장 입력할 수 있습니다.' },
          { value: 'split', label: '분할', hint: '화면을 좌우로 나눠 왼쪽에 텍스트·버튼, 오른쪽에 이미지를 배치합니다.' },
        ]}
        onChange={(v) => update('template', v)}
      />
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
      <StringField
        label="상품 ID 목록 (콤마 구분)"
        value={((content.product_ids as number[]) ?? []).join(', ')}
        onChange={(v) => update('product_ids', v.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0))}
        placeholder="예: 1, 2, 3 (비워두면 최신 상품 자동 표시)"
      />
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
      <StringField
        label="상품 ID 목록 (콤마 구분)"
        value={((content.product_ids as number[]) ?? []).join(', ')}
        onChange={(v) => update('product_ids', v.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0))}
        placeholder="예: 1, 2, 3 (비워두면 최신 상품 자동 표시)"
      />
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
      <StringField
        label="카테고리 ID 목록 (콤마 구분)"
        value={((content.category_ids as number[]) ?? []).join(', ')}
        onChange={(v) => update('category_ids', v.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0))}
        placeholder="예: 1, 2, 3 (비워두면 전체 카테고리 표시)"
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
};

const BLOCK_TYPE_DESCRIPTIONS: Record<PageBlock['type'], string> = {
  hero_banner: 'ℹ️ 페이지 최상단에 크게 표시되는 배너입니다. 제목·이미지·버튼을 설정하세요. 이미지 URL을 비우면 배경색만 표시됩니다.',
  product_grid: 'ℹ️ 상품을 격자(바둑판) 형태로 나열합니다. 상품 ID를 콤마로 구분해 입력하거나, 비워두면 최신 상품을 자동으로 가져옵니다.',
  product_carousel: 'ℹ️ 상품을 좌우 슬라이드로 표시합니다. 상품 ID를 콤마로 구분해 입력하거나, 비워두면 최신 상품을 자동으로 가져옵니다.',
  category_nav: 'ℹ️ 카테고리 바로가기 버튼 모음입니다. 카테고리 ID를 콤마로 구분해 입력하거나, 비워두면 전체 카테고리를 표시합니다.',
  promotion_banner: 'ℹ️ 할인·이벤트를 강조하는 띠 배너입니다. 종료일을 설정하면 기간 표시가 가능합니다. 히어로 배너보다 작고 콤팩트합니다.',
  text_content: 'ℹ️ HTML 형식의 자유 텍스트 영역입니다. 공지사항·브랜드 소개 등에 사용하세요. <b>볼드</b>, <a href="">링크</a> 등 기본 HTML 태그 사용 가능합니다.',
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
