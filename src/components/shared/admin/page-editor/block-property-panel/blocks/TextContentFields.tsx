'use client';

import { localMessage } from '@/utils/localMessages';
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
        label={localMessage('adminEnglish.textAlignment')}
        value={(content.textAlign as string) ?? 'center'}
        options={TEXT_ALIGN_OPTIONS}
        onChange={(v) => update('textAlign', v)}
      />
      <StringField label={localMessage('adminEnglish.htmlContent')} value={(content.html as string) ?? ''} onChange={(v) => update('html', v)} multiline />
      <StringField label={localMessage('adminEnglish.htmlContentEn')} value={(content.html_en as string) ?? ''} onChange={(v) => update('html_en', v)} multiline placeholder={localMessage('adminEnglish.englishHtmlContent')} />
      <SelectField
        label={localMessage('adminEnglish.template')}
        value={(content.template as string) ?? 'default'}
        options={TEXT_CONTENT_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
    </>
  );
}
