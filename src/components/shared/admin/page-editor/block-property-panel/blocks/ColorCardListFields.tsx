'use client';

import { localMessage } from '@/utils/localMessages';
import SectionHeadingFields from './SectionHeadingFields';
import { ImageUploadField, ItemListEditor, StringField, TagListField, createEditorId } from './GenericItemFields';
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
        label={localMessage('adminEnglish.layout')}
        value={(content.layout as string) ?? 'alternating'}
        options={[{ value: 'alternating', label: localMessage('adminEnglish.label2AlternatingColumns') }, { value: 'grid-3', label: localMessage('adminEnglish.label3ColumnGrid') }]}
        onChange={(value) => update('layout', value)}
      />
      <ItemListEditor<ColorCardItem>
        label={localMessage('adminEnglish.colorCardItems')}
        items={items}
        onChange={(next) => update('items', next)}
        createItem={() => ({ id: createEditorId(), color: '#8B4513', nameKo: '', nameEn: '', region: '', description: '', characteristics: [], href: '', hrefLabel: '' })}
        getTitle={(item, index) => item.nameKo || localMessage('adminEnglish.itemTitle', { number: index + 1 })}
        renderItem={(item, _index, updateItem) => (
          <div className="space-y-2">
            <ImageUploadField label={localMessage('admin.imageUpload.label')} value={item.imageUrl ?? ''} onChange={(value) => updateItem({ imageUrl: value })} />
            <StringField label={localMessage('adminEnglish.color')} value={item.color} onChange={(value) => updateItem({ color: value })} placeholder="#8B4513" />
            <div className="h-8 rounded border" style={{ backgroundColor: item.color || '#8B4513' }} aria-hidden="true" />
            <StringField label={localMessage('adminEnglish.englishName')} value={item.nameEn ?? ''} onChange={(value) => updateItem({ nameEn: value })} />
            <StringField label={localMessage('adminEnglish.koreanName')} value={item.nameKo} onChange={(value) => updateItem({ nameKo: value })} />
            <StringField label={localMessage('archivePage.artistRegionLabel')} value={item.region ?? ''} onChange={(value) => updateItem({ region: value })} />
            <StringField label={localMessage('adminEnglish.descriptionHtml')} value={item.description} onChange={(value) => updateItem({ description: value })} multiline />
            <TagListField label={localMessage('adminEnglish.attributeTags')} value={item.characteristics ?? []} onChange={(value) => updateItem({ characteristics: value })} />
            <StringField label={localMessage('adminEnglish.linkUrl')} value={item.href ?? ''} onChange={(value) => updateItem({ href: value })} />
            <StringField label={localMessage('adminEnglish.linkLabel')} value={item.hrefLabel ?? ''} onChange={(value) => updateItem({ hrefLabel: value })} />
          </div>
        )}
      />
    </>
  );
}
