'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ItemListEditor, StringField, TagListField, createEditorId } from './GenericItemFields';
import { SelectField, createContentUpdater } from '../FormFields';
import type { ColorCardItem } from '@/lib/api';

interface ColorCardListFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function getItems(content: Record<string, unknown>) {
  return Array.isArray(content.items) ? (content.items as ColorCardItem[]) : [];
}

export default function ColorCardListFields({ content, onChange }: ColorCardListFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const items = getItems(content);

  return (
    <>
      <SectionHeadingFields content={content} onChange={onChange} />
      <SelectField
        label="레이아웃"
        value={(content.layout as string) ?? 'alternating'}
        options={[{ value: 'alternating', label: '2열 교차' }, { value: 'grid-3', label: '3열 그리드' }]}
        onChange={(value) => update('layout', value)}
      />
      <ItemListEditor<ColorCardItem>
        label="색상 카드 항목"
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), color: '#8B4513', nameKo: '', nameEn: '', region: '', description: '', characteristics: [], href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.nameKo || `항목 ${index + 1}`}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <StringField label="색상" value={item.color} onChange={(value) => updateItem({ color: value })} placeholder="#8B4513" />
            <div className="h-8 rounded border" style={{ backgroundColor: item.color || '#8B4513' }} aria-hidden="true" />
            <StringField label="영문명" value={item.nameEn ?? ''} onChange={(value) => updateItem({ nameEn: value })} />
            <StringField label="한글명" value={item.nameKo} onChange={(value) => updateItem({ nameKo: value })} />
            <StringField label="지역" value={item.region ?? ''} onChange={(value) => updateItem({ region: value })} />
            <StringField label="설명 (HTML)" value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
            <TagListField label="특성 태그" value={item.characteristics ?? []} onChange={(value) => updateItem({ characteristics: value })} />
            <StringField label="링크 URL" value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label="링크 라벨" value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
