'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { PROMOTION_TEMPLATE_OPTIONS } from '../blockConfig';

interface PromotionBannerFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function PromotionBannerFields({ content, onChange }: PromotionBannerFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="제목 (EN)" value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder="영문 제목" />
      <StringField label="부제목" value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label="부제목 (EN)" value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder="영문 부제목" />
      <StringField label="이미지 URL" value={(content.image_url as string) ?? ''} onChange={(v) => update('image_url', v)} />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA 텍스트 (EN)" value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder="영문 CTA" />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <StringField label="종료일" value={(content.expires_at as string) ?? ''} onChange={(v) => update('expires_at', v)} placeholder="YYYY-MM-DD" />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'full-width'}
        options={PROMOTION_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}
