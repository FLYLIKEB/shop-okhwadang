'use client';

import { localMessage } from '@/utils/localMessages';
import type { ProductSort } from '@/lib/api';
import { NumberField, SelectField, StringField, createContentUpdater } from '../FormFields';
import { PRODUCT_GRID_TEMPLATE_OPTIONS, PRODUCT_SORT_OPTIONS } from '../blockConfig';
import ProductCategoryPicker from '../ProductCategoryPicker';

interface ProductGridFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function ProductGridFields({ content, onChange }: ProductGridFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label={localMessage('popups.title')} value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label={localMessage('adminEnglish.titleEn')} value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder={localMessage('adminEnglish.englishTitle')} />
      <NumberField label={localMessage('adminEnglish.itemCount')} value={(content.limit as number) ?? 8} onChange={(v) => update('limit', v)} />
      <SelectField
        label={localMessage('adminEnglish.template')}
        value={(content.template as string) ?? '3col'}
        options={PRODUCT_GRID_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      <SelectField
        label={localMessage('admin.attributes.sortOrder')}
        value={(content.sort as string) ?? 'latest'}
        options={PRODUCT_SORT_OPTIONS}
        onChange={(v) => update('sort', v as ProductSort)}
      />
      <ProductCategoryPicker content={content} onChange={onChange} />
    </>
  );
}
