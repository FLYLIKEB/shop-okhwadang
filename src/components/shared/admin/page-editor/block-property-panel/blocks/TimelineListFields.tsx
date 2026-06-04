'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ItemListEditor, NumberField, StringField, createEditorId } from './GenericItemFields';
import { createContentUpdater } from '../FormFields';
import type { TimelineItem } from '@/lib/api';

interface TimelineListFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function getItems(content: Record<string, unknown>) {
  return Array.isArray(content.items) ? (content.items as TimelineItem[]) : [];
}

export default function TimelineListFields({ content, onChange }: TimelineListFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const items = getItems(content);

  return (
    <>
      <SectionHeadingFields content={content} onChange={onChange} />
      <ItemListEditor<TimelineItem>
        label="타임라인 항목"
        items={items}
        onChange={(next) => update('items', next)}
        createItem={(index) => ({ id: createEditorId(), step: index + 1, label: '', title: '', description: '' })}
        getTitle={(item, index) => item.title || `단계 ${index + 1}`}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <NumberField label="단계 번호" value={item.step} onChange={(value) => updateItem({ step: value })} />
            <StringField label="라벨" value={item.label ?? ''} onChange={(value) => updateItem({ label: value })} />
            <StringField label="제목" value={item.title} onChange={(value) => updateItem({ title: value })} />
            <StringField label="설명 (HTML)" value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
          </div>
        )}
      />
    </>
  );
}
