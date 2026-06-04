'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ImageUploadField, ItemListEditor, StringField, createEditorId } from './GenericItemFields';
import { SelectField, createContentUpdater } from '../FormFields';
import type { ImageCardItem } from '@/lib/api';

interface ImageCardGridFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function getItems(content: Record<string, unknown>) {
  return Array.isArray(content.items) ? (content.items as ImageCardItem[]) : [];
}

export default function ImageCardGridFields({ content, onChange }: ImageCardGridFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const items = getItems(content);

  return (
    <>
      <SectionHeadingFields content={content} onChange={onChange} />
      <SelectField
        label="열 수"
        value={String((content.columns as number) ?? 3)}
        options={[{ value: '2', label: '2열' }, { value: '3', label: '3열' }, { value: '4', label: '4열' }]}
        onChange={(value) => update('columns', Number(value))}
      />
      <ItemListEditor<ImageCardItem>
        label="이미지 카드 항목"
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), imageUrl: '', name: '', description: '', href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.name || `항목 ${index + 1}`}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField label="이미지 URL" value={item.imageUrl} onChange={(value) => updateItem({ imageUrl: value })} />
            <StringField label="이름" value={item.name} onChange={(value) => updateItem({ name: value })} />
            <StringField label="설명 (HTML)" value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
            <StringField label="링크 URL" value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label="링크 라벨" value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
