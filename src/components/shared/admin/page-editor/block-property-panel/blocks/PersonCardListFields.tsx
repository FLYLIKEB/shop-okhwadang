'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ImageUploadField, ItemListEditor, StringField, createEditorId } from './GenericItemFields';
import { createContentUpdater } from '../FormFields';
import { localMessage } from '@/utils/localMessages';
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
        label={localMessage('adminEnglish.personCardItems')}
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), imageUrl: '', title: '', name: '', region: '', specialty: '', story: '', href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.name || localMessage('adminEnglish.itemTitle', { number: index + 1 })}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField label={localMessage('admin.imageUpload.label')} value={item.imageUrl} onChange={(value) => updateItem({ imageUrl: value })} />
            <StringField label={localMessage('adminEnglish.role')} value={item.title ?? ''} onChange={(value) => updateItem({ title: value })} />
            <StringField label={localMessage('auth.name')} value={item.name} onChange={(value) => updateItem({ name: value })} />
            <StringField label={localMessage('archivePage.artistRegionLabel')} value={item.region ?? ''} onChange={(value) => updateItem({ region: value })} />
            <StringField label={localMessage('artistPage.specialty')} value={item.specialty ?? ''} onChange={(value) => updateItem({ specialty: value })} />
            <StringField label={localMessage('adminEnglish.storyHtml')} value={item.story} onChange={(value) => updateItem({ story: value })} multiline />
            <StringField label={localMessage('adminEnglish.linkUrl')} value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label={localMessage('adminEnglish.linkLabel')} value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
