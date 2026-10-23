'use client';

import SectionHeadingFields from './SectionHeadingFields';
import { ImageUploadField, ItemListEditor, StringField, createEditorId } from './GenericItemFields';
import { SelectField, createContentUpdater } from '../FormFields';
import { localMessage } from '@/utils/localMessages';
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
        label={localMessage('adminEnglish.columns')}
        value={String((content.columns as number) ?? 3)}
        options={[{ value: '2', label: localMessage('adminEnglish.label2Columns') }, { value: '3', label: localMessage('adminEnglish.label3Columns') }, { value: '4', label: localMessage('adminEnglish.label4Columns') }]}
        onChange={(value) => update('columns', Number(value))}
      />
      <ItemListEditor<ImageCardItem>
        label={localMessage('adminEnglish.imageCardItems')}
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), imageUrl: '', name: '', description: '', href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.name || localMessage('adminEnglish.itemTitle', { number: index + 1 })}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField label={localMessage('admin.imageUpload.label')} value={item.imageUrl} onChange={(value) => updateItem({ imageUrl: value })} />
            <StringField label={localMessage('auth.name')} value={item.name} onChange={(value) => updateItem({ name: value })} />
            <StringField label={localMessage('adminEnglish.descriptionHtml')} value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
            <StringField label={localMessage('adminEnglish.linkUrl')} value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label={localMessage('adminEnglish.linkLabel')} value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
