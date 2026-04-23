'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { SPLIT_BG_OPTIONS, SPLIT_TEMPLATE_OPTIONS } from '../blockConfig';

interface SplitContentFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function SplitContentFields({ content, onChange }: SplitContentFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField label="서브타이틀" value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} placeholder="Our Story" />
      <StringField label="서브타이틀 (EN)" value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder="Our Story" />
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="제목 (EN)" value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder="영문 제목" />
      <StringField label="설명" value={(content.description as string) ?? ''} onChange={(v) => update('description', v)} multiline placeholder="브랜드 소개 텍스트" />
      <StringField label="설명 (EN)" value={(content.description_en as string) ?? ''} onChange={(v) => update('description_en', v)} multiline placeholder="영문 설명" />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA 텍스트 (EN)" value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder="영문 CTA" />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'default'}
        options={SPLIT_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      <SelectField
        label="배경색"
        value={(content.use_alternate_bg as boolean) ? 'alternate' : 'white'}
        options={SPLIT_BG_OPTIONS}
        onChange={(v) => update('use_alternate_bg', v === 'alternate')}
      />
    </>
  );
}
