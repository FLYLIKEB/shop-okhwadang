'use client';

import { NumberField, SelectField, StringField, createContentUpdater } from '../FormFields';
import { PRODUCT_GRID_TEMPLATE_OPTIONS } from '../blockConfig';
import ProductCategoryPicker from '../ProductCategoryPicker';

interface ProductGridFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function ProductGridFields({ content, onChange }: ProductGridFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="제목 (EN)" value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder="영문 제목" />
      <NumberField label="표시 개수" value={(content.limit as number) ?? 8} onChange={(v) => update('limit', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? '3col'}
        options={PRODUCT_GRID_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      <ProductCategoryPicker content={content} onChange={onChange} />
    </>
  );
}
