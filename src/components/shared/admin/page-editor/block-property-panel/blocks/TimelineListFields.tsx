'use client';

import { localMessage } from '@/utils/localMessages';
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
        label={localMessage('adminEnglish.timelineItems')}
        items={items}
        onChange={(next) => update('items', next)}
        createItem={(index) => ({ id: createEditorId(), step: index + 1, label: '', title: '', description: '' })}
        getTitle={(item, index) => item.title || localMessage('adminEnglish.stepTitle', { number: index + 1 })}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <NumberField label={localMessage('adminEnglish.stepNumber')} value={item.step} onChange={(value) => updateItem({ step: value })} />
            <StringField label={localMessage('address.label')} value={item.label ?? ''} onChange={(value) => updateItem({ label: value })} />
            <StringField label={localMessage('popups.title')} value={item.title} onChange={(value) => updateItem({ title: value })} />
            <StringField label={localMessage('adminEnglish.descriptionHtml')} value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
          </div>
        )}
      />
    </>
  );
}
