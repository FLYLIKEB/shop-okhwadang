'use client';

import EntitySelector from '../../EntitySelector';
import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { CATEGORY_NAV_TEMPLATE_OPTIONS } from '../blockConfig';

interface CategoryNavFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function CategoryNavFields({ content, onChange }: CategoryNavFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const categoryIds = (content.category_ids as number[]) ?? [];

  return (
    <>
      <StringField
        label="제목"
        value={(content.title as string) ?? ''}
        onChange={(v) => update('title', v)}
        placeholder="카테고리"
      />
      <StringField
        label="제목 (EN)"
        value={(content.title_en as string) ?? ''}
        onChange={(v) => update('title_en', v)}
        placeholder="영문 제목"
      />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'text'}
        options={CATEGORY_NAV_TEMPLATE_OPTIONS}
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
