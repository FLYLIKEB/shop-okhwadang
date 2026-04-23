'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { TEXT_ALIGN_OPTIONS, TEXT_CONTENT_TEMPLATE_OPTIONS } from '../blockConfig';

interface TextContentFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function TextContentFields({ content, onChange }: TextContentFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <SelectField
        label="텍스트 정렬"
        value={(content.textAlign as string) ?? 'center'}
        options={TEXT_ALIGN_OPTIONS}
        onChange={(v) => update('textAlign', v)}
      />
      <StringField label="HTML 내용" value={(content.html as string) ?? ''} onChange={(v) => update('html', v)} multiline />
      <StringField label="HTML 내용 (EN)" value={(content.html_en as string) ?? ''} onChange={(v) => update('html_en', v)} multiline placeholder="영문 HTML 내용" />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'default'}
        options={TEXT_CONTENT_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}
