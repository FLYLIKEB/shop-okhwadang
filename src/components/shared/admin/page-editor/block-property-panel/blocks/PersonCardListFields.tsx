'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ImageUploadField, ItemListEditor, StringField, createEditorId } from './GenericItemFields';
import { createContentUpdater } from '../FormFields';
import type { PersonCardItem } from '@/lib/api';

interface PersonCardListFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function getItems(content: Record<string, unknown>) {
  return Array.isArray(content.items) ? (content.items as PersonCardItem[]) : [];
}

export default function PersonCardListFields({ content, onChange }: PersonCardListFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const items = getItems(content);

  return (
    <>
      <SectionHeadingFields content={content} onChange={onChange} />
      <ItemListEditor<PersonCardItem>
        label="인물 카드 항목"
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), imageUrl: '', title: '', name: '', region: '', specialty: '', story: '', href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.name || `항목 ${index + 1}`}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField label="이미지 URL" value={item.imageUrl} onChange={(value) => updateItem({ imageUrl: value })} />
            <StringField label="직함" value={item.title ?? ''} onChange={(value) => updateItem({ title: value })} />
            <StringField label="이름" value={item.name} onChange={(value) => updateItem({ name: value })} />
            <StringField label="지역" value={item.region ?? ''} onChange={(value) => updateItem({ region: value })} />
            <StringField label="전문 분야" value={item.specialty ?? ''} onChange={(value) => updateItem({ specialty: value })} />
            <StringField label="이야기 (HTML)" value={item.story} onChange={(value) => updateItem({ story: value })} multiline />
            <StringField label="링크 URL" value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label="링크 라벨" value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
