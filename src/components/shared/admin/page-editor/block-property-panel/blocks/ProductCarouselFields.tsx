'use client';

import type { ProductSort } from '@/lib/api';
import { NumberField, SelectField, StringField, createContentUpdater } from '../FormFields';
import { PRODUCT_CAROUSEL_TEMPLATE_OPTIONS, PRODUCT_SORT_OPTIONS } from '../blockConfig';
import ProductCategoryPicker from '../ProductCategoryPicker';

interface ProductCarouselFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function ProductCarouselFields({ content, onChange }: ProductCarouselFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="제목 (EN)" value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder="영문 제목" />
      <NumberField label="표시 개수" value={(content.limit as number) ?? 8} onChange={(v) => update('limit', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'default'}
        options={PRODUCT_CAROUSEL_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      <SelectField
        label="정렬"
        value={(content.sort as string) ?? 'latest'}
        options={PRODUCT_SORT_OPTIONS}
        onChange={(v) => update('sort', v as ProductSort)}
      />
      <ProductCategoryPicker content={content} onChange={onChange} />
    </>
  );
}
