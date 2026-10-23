'use client';

import { localMessage } from '@/utils/localMessages';
import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { SPLIT_BG_OPTIONS, SPLIT_TEMPLATE_OPTIONS } from '../blockConfig';
import { ImageUploadField } from './GenericItemFields';

interface SplitContentFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function SplitContentFields({ content, onChange }: SplitContentFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label={localMessage('adminEnglish.subtitle')} value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} placeholder="Our Story" />
      <StringField label={localMessage('adminEnglish.subtitleEn')} value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder="Our Story" />
      <StringField label={localMessage('popups.title')} value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label={localMessage('adminEnglish.titleEn')} value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder={localMessage('adminEnglish.englishTitle')} />
      <StringField label={localMessage('admin.points.table.description')} value={(content.description as string) ?? ''} onChange={(v) => update('description', v)} multiline placeholder={localMessage('adminEnglish.brandIntroductionText')} />
      <StringField label={localMessage('adminEnglish.descriptionEn')} value={(content.description_en as string) ?? ''} onChange={(v) => update('description_en', v)} multiline placeholder={localMessage('adminEnglish.englishDescription')} />
      <StringField label={localMessage('adminEnglish.ctaText')} value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label={localMessage('adminEnglish.ctaTextEn')} value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder={localMessage('adminEnglish.englishCta')} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <ImageUploadField
        label={localMessage('admin.imageUpload.label')}
        value={(content.image_url as string) ?? ''}
        onChange={(image_url, image_derivatives) => onChange({ ...content, image_url, image_derivatives })}
        cmsKind="hero"
      />
      <SelectField
        label={localMessage('adminEnglish.template')}
        value={(content.template as string) ?? 'default'}
        options={SPLIT_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      <SelectField
        label={localMessage('adminEnglish.backgroundColor')}
        value={(content.use_alternate_bg as boolean) ? 'alternate' : 'white'}
        options={SPLIT_BG_OPTIONS}
        onChange={(v) => update('use_alternate_bg', v === 'alternate')}
      />
    </>
  );
}
