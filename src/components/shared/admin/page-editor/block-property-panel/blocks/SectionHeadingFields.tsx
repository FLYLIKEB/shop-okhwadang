'use client';

import { localMessage } from '@/utils/localMessages';
import { createContentUpdater, StringField } from '../FormFields';

interface SectionHeadingFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export default function SectionHeadingFields({ content, onChange }: SectionHeadingFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField
        label={localMessage('adminEnglish.sectionLabel')}
        value={(content.sectionLabel as string) ?? ''}
        onChange={(value) => update('sectionLabel', value)}
        placeholder={localMessage('adminEnglish.leaveEmptyToUseTheDefaultTranslated')}
      />
      <StringField
        label={localMessage('adminEnglish.sectionTitle')}
        value={(content.sectionTitle as string) ?? ''}
        onChange={(value) => update('sectionTitle', value)}
        placeholder={localMessage('adminEnglish.leaveEmptyToUseTheDefaultTranslated2')}
      />
      <StringField
        label={localMessage('adminEnglish.sectionDescription')}
        value={(content.sectionDesc as string) ?? ''}
        onChange={(value) => update('sectionDesc', value)}
        placeholder={localMessage('adminEnglish.leaveEmptyToUseTheDefaultTranslated3')}
        multiline
      />
    </>
  );
}
