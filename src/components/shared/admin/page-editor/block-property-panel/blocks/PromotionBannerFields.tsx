'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { ImageUploadField } from './GenericItemFields';
import { localMessage } from '@/utils/localMessages';
import { PROMOTION_TEMPLATE_OPTIONS } from '../blockConfig';

interface PromotionBannerFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function PromotionBannerFields({ content, onChange }: PromotionBannerFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const updateEndDate = (value: string) => {
    const nextContent = { ...content };
    delete nextContent.expires_at;
    onChange({ ...nextContent, end_date: value });
  };

  return (
    <>
      <StringField label={localMessage('popups.title')} value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label={localMessage('adminEnglish.titleEn')} value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder={localMessage('adminEnglish.englishTitle')} />
      <StringField label={localMessage('adminEnglish.subtitle')} value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label={localMessage('adminEnglish.subtitleEn')} value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder={localMessage('adminEnglish.englishSubtitle')} />
      <ImageUploadField
        label={localMessage('admin.imageUpload.label')}
        value={(content.image_url as string) ?? ''}
        onChange={(image_url, image_derivatives) => onChange({ ...content, image_url, image_derivatives })}
        cmsKind="promotion"
      />
      <StringField label={localMessage('adminEnglish.ctaText')} value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label={localMessage('adminEnglish.ctaTextEn')} value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder={localMessage('adminEnglish.englishCta')} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <StringField
        label={localMessage('admin.dashboard.endDate')}
        value={((content.end_date as string) ?? (content.expires_at as string)) ?? ''}
        onChange={updateEndDate}
        placeholder="YYYY-MM-DD"
      />
      <SelectField
        label={localMessage('adminEnglish.template')}
        value={(content.template as string) ?? 'full-width'}
        options={PROMOTION_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}
